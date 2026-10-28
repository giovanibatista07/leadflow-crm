import "server-only";
import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db";
import { computeDueDate, getNextStepOrder } from "@/lib/cadence/engine";
import type { ActivityOutcome } from "@/lib/validation/activity";

type TxClient = Prisma.TransactionClient;

/**
 * Starts one or more leads on the company's default cadence (SPEC.md core
 * workflow step 4: "Each lead starts at Step 1 of the manager's
 * sequence"). A company with no default cadence yet just leaves the
 * lead(s) without a due date -- still assigned, only not yet scheduled.
 * One updateMany regardless of how many leads, not one call per lead.
 */
export async function startCadenceForLeads(
  client: TxClient | typeof prisma,
  companyId: string,
  leadIds: string[],
): Promise<void> {
  if (leadIds.length === 0) return;
  const cadence = await client.cadence.findFirst({
    where: { companyId, isDefault: true },
    include: { steps: { where: { order: 1 } } },
  });
  const firstStep = cadence?.steps[0];
  if (!firstStep) return;

  // Step 1 has no "wait before" itself -- it's due as soon as the lead starts.
  await client.lead.updateMany({
    where: { id: { in: leadIds } },
    data: { currentStep: 1, nextDueAt: new Date() },
  });
}

export async function startCadenceForLead(
  client: TxClient | typeof prisma,
  companyId: string,
  leadId: string,
): Promise<void> {
  return startCadenceForLeads(client, companyId, [leadId]);
}

export type SweepResult = { markedUnresponsive: number };

/**
 * The 15-minute scheduled job (CLAUDE.md / SPEC.md section 12). Finds
 * leads sitting on their cadence's last step past its due date with no
 * resolution logged, and marks them Unresponsive (SPEC.md section 5:
 * "Sequence finished with no response"). Advancing through earlier steps
 * happens when an advisor logs an activity's outcome, not here.
 */
export async function sweepDueSteps(now: Date = new Date()): Promise<SweepResult> {
  const companies = await prisma.company.findMany({ select: { id: true } });
  let markedUnresponsive = 0;

  for (const company of companies) {
    const defaultCadence = await prisma.cadence.findFirst({
      where: { companyId: company.id, isDefault: true },
      include: { steps: { orderBy: { order: "desc" }, take: 1 } },
    });
    const lastStep = defaultCadence?.steps[0];
    if (!lastStep) continue;

    const overdueLeads = await prisma.lead.findMany({
      where: {
        companyId: company.id,
        status: "IN_SEQUENCE",
        currentStep: lastStep.order,
        nextDueAt: { lte: now },
      },
      select: { id: true },
    });
    if (overdueLeads.length === 0) continue;

    await prisma.$transaction(async (tx) => {
      await tx.lead.updateMany({
        where: { id: { in: overdueLeads.map((l) => l.id) } },
        data: { status: "UNRESPONSIVE" },
      });
      await tx.auditLog.createMany({
        data: overdueLeads.map((lead) => ({
          companyId: company.id,
          userId: null,
          action: "lead_unresponsive",
          targetType: "lead",
          targetId: lead.id,
        })),
      });
    });
    markedUnresponsive += overdueLeads.length;
  }

  return { markedUnresponsive };
}

/**
 * Applies SPEC.md section 5's outcome rules after an advisor logs an
 * attempt. "Sequence finished with no response" is deliberately absent --
 * that one is the cadence scheduler's job (sweepDueSteps), not something
 * logged here.
 */
export async function applyActivityOutcome(
  client: TxClient | typeof prisma,
  companyId: string,
  leadId: string,
  outcome: ActivityOutcome,
  scheduledAt?: Date,
): Promise<void> {
  if (outcome === "QUALIFIED") {
    await client.lead.update({
      where: { id: leadId },
      data: { status: "QUALIFIED", nextDueAt: null },
    });
    return;
  }

  if (outcome === "NOT_INTERESTED") {
    await client.lead.update({
      where: { id: leadId },
      data: { status: "LOST", nextDueAt: null },
    });
    return;
  }

  if (outcome === "CALL_BACK_LATER") {
    await client.lead.update({
      where: { id: leadId },
      data: { nextDueAt: scheduledAt },
    });
    return;
  }

  // NO_ANSWER: advance to the next step on schedule, if there is one.
  const lead = await client.lead.findUniqueOrThrow({
    where: { id: leadId },
    select: { currentStep: true },
  });
  const cadence = await client.cadence.findFirst({
    where: { companyId, isDefault: true },
    include: { steps: { orderBy: { order: "asc" } } },
  });
  const currentStepRecord = cadence?.steps.find((s) => s.order === lead.currentStep);
  if (!cadence || !currentStepRecord) return;

  const nextOrder = getNextStepOrder(cadence.steps, lead.currentStep);
  if (nextOrder == null) return;

  const nextDueAt = computeDueDate(new Date(), currentStepRecord.waitDays) ?? new Date();
  await client.lead.update({
    where: { id: leadId },
    data: { currentStep: nextOrder, nextDueAt },
  });
}
