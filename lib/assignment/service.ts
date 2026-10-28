import "server-only";
import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db";
import { distributeRoundRobin, groupByAssignee } from "@/lib/assignment/engine";
import { startCadenceForLead, startCadenceForLeads } from "@/lib/cadence/service";
import { notify, notifyMany } from "@/lib/notifications/service";

type TxClient = Prisma.TransactionClient;

const ACTIVE_LEAD_STATUSES: Prisma.LeadWhereInput["status"] = {
  notIn: ["WON", "LOST"],
};

/** Capabilities that uniquely identify an advisor-like or closer-like role (lib/auth/default-roles.ts). */
const ADVISOR_CAPABILITY = "view_own_leads";
const CLOSER_CAPABILITY = "set_won_lost";

async function activeUsersWithCapability(
  client: TxClient | typeof prisma,
  companyId: string,
  capability: string,
) {
  const users = await client.user.findMany({
    where: { companyId, active: true },
    select: { id: true, role: { select: { permissions: true } } },
  });
  return users.filter((u) => {
    const permissions = u.role.permissions as string[];
    return permissions.includes("*") || permissions.includes(capability);
  });
}

async function loadCandidates(
  client: TxClient | typeof prisma,
  companyId: string,
  userIds: string[],
  assigneeField: "assignedAdvisorId" | "assignedCloserId",
) {
  if (userIds.length === 0) return [];

  const counts: { assigneeId: string | null; count: number }[] =
    assigneeField === "assignedAdvisorId"
      ? (
          await client.lead.groupBy({
            by: ["assignedAdvisorId"],
            where: { companyId, assignedAdvisorId: { in: userIds }, status: ACTIVE_LEAD_STATUSES },
            _count: true,
          })
        ).map((c) => ({ assigneeId: c.assignedAdvisorId, count: c._count }))
      : (
          await client.lead.groupBy({
            by: ["assignedCloserId"],
            where: { companyId, assignedCloserId: { in: userIds }, status: ACTIVE_LEAD_STATUSES },
            _count: true,
          })
        ).map((c) => ({ assigneeId: c.assignedCloserId, count: c._count }));

  const countById = new Map(counts.map((c) => [c.assigneeId ?? "", c.count]));
  return userIds.map((id) => ({ id, count: countById.get(id) ?? 0 }));
}

/**
 * Round-robin assigns newly imported leads across active advisors (SPEC.md
 * "Assign: Leads are distributed to advisors (round-robin by default)").
 * Runs inside the import transaction; leads left over when there are no
 * active advisors simply stay unassigned (status NEW).
 */
export async function assignAdvisorsToNewLeads(
  tx: TxClient,
  companyId: string,
  leadIds: string[],
): Promise<number> {
  if (leadIds.length === 0) return 0;
  const advisors = await activeUsersWithCapability(tx, companyId, ADVISOR_CAPABILITY);
  const candidates = await loadCandidates(
    tx,
    companyId,
    advisors.map((a) => a.id),
    "assignedAdvisorId",
  );
  const assignments = distributeRoundRobin(leadIds, candidates);
  const byAdvisor = groupByAssignee(assignments);

  for (const [advisorId, ids] of byAdvisor) {
    await tx.lead.updateMany({
      where: { id: { in: ids } },
      data: { assignedAdvisorId: advisorId, status: "IN_SEQUENCE" },
    });
  }
  // Every newly assigned lead starts its cadence at once, not per advisor.
  await startCadenceForLeads(tx, companyId, [...assignments.keys()]);

  await notifyMany(
    tx,
    companyId,
    "NEW_ASSIGNMENT",
    [...assignments.entries()].map(([leadId, advisorId]) => ({ userId: advisorId, leadId })),
  );

  return assignments.size;
}

export type ReassignResult = { error: string } | { success: true };

/** Manager-initiated manual override (SPEC.md "Manual override: the manager can reassign any lead"). */
export async function reassignLeadAdvisor(
  companyId: string,
  leadId: string,
  advisorId: string,
): Promise<ReassignResult> {
  const lead = await prisma.lead.findFirst({ where: { id: leadId, companyId } });
  if (!lead) return { error: "Lead not found" };

  const advisors = await activeUsersWithCapability(prisma, companyId, ADVISOR_CAPABILITY);
  if (!advisors.some((a) => a.id === advisorId)) {
    return { error: "That person isn't an active advisor on this company" };
  }

  const wasUnstarted = lead.status === "NEW";
  await prisma.lead.update({
    where: { id: leadId },
    data: {
      assignedAdvisorId: advisorId,
      status: wasUnstarted ? "IN_SEQUENCE" : lead.status,
    },
  });
  if (wasUnstarted) {
    await startCadenceForLead(prisma, companyId, leadId);
  }
  await notify(prisma, companyId, advisorId, "NEW_ASSIGNMENT", leadId);
  return { success: true };
}

export type HandoffResult = { error: string } | { success: true; closerId: string };

/**
 * Hands a lead to a closer (SPEC.md "Closer assignment: round-robin across
 * closers, or the advisor picks one"). `closerId` omitted/empty means
 * round robin; otherwise the caller's explicit pick is validated and used.
 */
export async function handoffLeadToCloser(
  companyId: string,
  leadId: string,
  closerId: string | undefined,
): Promise<HandoffResult> {
  const lead = await prisma.lead.findFirst({ where: { id: leadId, companyId } });
  if (!lead) return { error: "Lead not found" };
  if (lead.status === "WON" || lead.status === "LOST" || lead.status === "WITH_CLOSER") {
    return { error: "This lead has already been handed off or closed" };
  }

  const closers = await activeUsersWithCapability(prisma, companyId, CLOSER_CAPABILITY);
  let chosenCloserId: string | null;

  if (closerId) {
    if (!closers.some((c) => c.id === closerId)) {
      return { error: "That person isn't an active closer on this company" };
    }
    chosenCloserId = closerId;
  } else {
    const candidates = await loadCandidates(
      prisma,
      companyId,
      closers.map((c) => c.id),
      "assignedCloserId",
    );
    chosenCloserId = distributeRoundRobin([leadId], candidates).get(leadId) ?? null;
  }

  if (!chosenCloserId) {
    return { error: "No active closers are available" };
  }

  await prisma.lead.update({
    where: { id: leadId },
    data: { assignedCloserId: chosenCloserId, status: "WITH_CLOSER" },
  });
  await notify(prisma, companyId, chosenCloserId, "HANDOFF", leadId);
  return { success: true, closerId: chosenCloserId };
}
