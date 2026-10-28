import "server-only";
import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db";

type TxClient = Prisma.TransactionClient;
type NotificationType = "NEW_ASSIGNMENT" | "HANDOFF" | "STEP_DUE" | "MEETING_SOON" | "OVERDUE";

/** Mirrors lib/auth/permissions.ts's hasPermission: "*" or the literal capability. */
async function activeUsersWithCapability(companyId: string, capability: string) {
  const users = await prisma.user.findMany({
    where: { companyId, active: true },
    select: { id: true, role: { select: { permissions: true } } },
  });
  return users.filter((u) => {
    const permissions = u.role.permissions as string[];
    return permissions.includes("*") || permissions.includes(capability);
  });
}

/** SPEC.md: "Notifications never include call notes, only a link to the lead." */
export async function notify(
  client: TxClient | typeof prisma,
  companyId: string,
  userId: string,
  type: NotificationType,
  leadId: string,
): Promise<void> {
  await client.notification.create({ data: { companyId, userId, type, leadId } });
}

export async function notifyMany(
  client: TxClient | typeof prisma,
  companyId: string,
  type: NotificationType,
  rows: { userId: string; leadId: string }[],
): Promise<void> {
  if (rows.length === 0) return;
  await client.notification.createMany({
    data: rows.map((r) => ({ companyId, userId: r.userId, type, leadId: r.leadId })),
  });
}

/** A manager overdue alert fires once per lead past this many hours overdue. */
const OVERDUE_THRESHOLD_HOURS = 24;
/** A meeting is "about to start" within this many minutes. */
const MEETING_SOON_WINDOW_MINUTES = 15;

async function hasUnreadNotification(
  companyId: string,
  userId: string,
  type: NotificationType,
  leadId: string,
): Promise<boolean> {
  const existing = await prisma.notification.findFirst({
    where: { companyId, userId, type, leadId, readAt: null },
    select: { id: true },
  });
  return existing != null;
}

export type NotificationSweepResult = {
  stepDue: number;
  meetingSoon: number;
  overdue: number;
};

/**
 * Generates the time-based notifications (SPEC.md: "a step coming due and
 * a meeting about to start", "managers notified when steps go overdue past
 * a set limit"). Runs alongside the cadence scheduler's own sweep. Each
 * kind is deduped by "does this person already have an unread one for this
 * lead" -- once they read it, a still-overdue lead can notify again next
 * sweep instead of going silent forever.
 */
export async function sweepNotifications(now: Date = new Date()): Promise<NotificationSweepResult> {
  let stepDue = 0;
  let meetingSoon = 0;
  let overdue = 0;

  const companies = await prisma.company.findMany({ select: { id: true } });

  for (const company of companies) {
    const defaultCadence = await prisma.cadence.findFirst({
      where: { companyId: company.id, isDefault: true },
      include: { steps: { orderBy: { order: "asc" } } },
    });
    if (!defaultCadence) continue;
    const stepByOrder = new Map(defaultCadence.steps.map((s) => [s.order, s]));

    // Already due or overdue (STEP_DUE, and OVERDUE once far enough past).
    const dueLeads = await prisma.lead.findMany({
      where: {
        companyId: company.id,
        status: "IN_SEQUENCE",
        assignedAdvisorId: { not: null },
        nextDueAt: { lte: now },
      },
      select: { id: true, assignedAdvisorId: true, nextDueAt: true },
    });

    for (const lead of dueLeads) {
      if (!lead.assignedAdvisorId || !lead.nextDueAt) continue;

      if (!(await hasUnreadNotification(company.id, lead.assignedAdvisorId, "STEP_DUE", lead.id))) {
        await notify(prisma, company.id, lead.assignedAdvisorId, "STEP_DUE", lead.id);
        stepDue += 1;
      }

      const hoursOverdue = (now.getTime() - lead.nextDueAt.getTime()) / 3_600_000;
      if (hoursOverdue >= OVERDUE_THRESHOLD_HOURS) {
        const managers = await activeUsersWithCapability(company.id, "reassign_leads");
        for (const manager of managers) {
          if (!(await hasUnreadNotification(company.id, manager.id, "OVERDUE", lead.id))) {
            await notify(prisma, company.id, manager.id, "OVERDUE", lead.id);
            overdue += 1;
          }
        }
      }
    }

    // Not yet due, but within the window before a meeting starts.
    const meetingWindowEnd = new Date(now.getTime() + MEETING_SOON_WINDOW_MINUTES * 60_000);
    const upcomingLeads = await prisma.lead.findMany({
      where: {
        companyId: company.id,
        status: "IN_SEQUENCE",
        assignedAdvisorId: { not: null },
        nextDueAt: { gt: now, lte: meetingWindowEnd },
      },
      select: { id: true, assignedAdvisorId: true, currentStep: true },
    });

    for (const lead of upcomingLeads) {
      if (!lead.assignedAdvisorId) continue;
      const step = stepByOrder.get(lead.currentStep);
      if (step?.actionType !== "MEETING") continue;
      if (await hasUnreadNotification(company.id, lead.assignedAdvisorId, "MEETING_SOON", lead.id)) continue;
      await notify(prisma, company.id, lead.assignedAdvisorId, "MEETING_SOON", lead.id);
      meetingSoon += 1;
    }
  }

  return { stepDue, meetingSoon, overdue };
}

export type { NotificationType };
