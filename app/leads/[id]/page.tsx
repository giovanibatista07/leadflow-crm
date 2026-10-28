import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { LocalDateTime } from "@/components/local-date-time";
import { ActivityForm } from "@/app/today/activity-form";
import { HandoffForm } from "./handoff-form";
import { CloserActivityForm } from "./closer-activity-form";

const HANDOFF_ELIGIBLE_STATUSES = new Set(["NEW", "IN_SEQUENCE", "QUALIFIED"]);

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const lead = await prisma.lead.findFirst({
    where: { id, companyId: user.companyId },
    include: {
      assignedAdvisor: { select: { id: true, name: true } },
      assignedCloser: { select: { id: true, name: true } },
      activities: { orderBy: { completedAt: "desc" }, include: { user: { select: { name: true } } } },
    },
  });
  if (!lead) notFound();

  const canViewAll = hasPermission(user, "view_all_leads");
  const isOwnAdvisorLead = lead.assignedAdvisorId === user.id;
  const isOwnCloserLead = lead.assignedCloserId === user.id;
  if (!canViewAll && !isOwnAdvisorLead && !isOwnCloserLead) {
    redirect("/dashboard");
  }

  const defaultCadence = await prisma.cadence.findFirst({
    where: { companyId: user.companyId, isDefault: true },
    include: { steps: { orderBy: { order: "asc" } } },
  });
  const currentStepRecord = defaultCadence?.steps.find((s) => s.order === lead.currentStep);

  const canHandoff =
    (hasPermission(user, "handoff_to_closer") && isOwnAdvisorLead) || hasPermission(user, "reassign_leads");
  const showHandoff = canHandoff && HANDOFF_ELIGIBLE_STATUSES.has(lead.status);

  const closers = showHandoff
    ? await prisma.user.findMany({
        where: { companyId: user.companyId, active: true, role: { name: "closer" } },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      })
    : [];

  const canLogAdvisorActivity =
    hasPermission(user, "log_activity") &&
    (isOwnAdvisorLead || canViewAll) &&
    lead.status === "IN_SEQUENCE";
  const canLogCloserActivity =
    hasPermission(user, "set_won_lost") &&
    (isOwnCloserLead || canViewAll) &&
    lead.status !== "WON" &&
    lead.status !== "LOST";

  return (
    <main>
      <p>
        <Link href="/leads">Back to leads</Link>
      </p>
      <h1>
        {lead.firstName} {lead.lastName}
      </h1>
      <p>
        Status: {lead.status} · Source: {lead.source}
      </p>
      <ul>
        {lead.email && <li>Email: {lead.email}</li>}
        {lead.phone && <li>Phone: {lead.phone}</li>}
        {lead.sport && <li>Sport: {lead.sport}</li>}
        {lead.position && <li>Position: {lead.position}</li>}
        {lead.location && <li>Location: {lead.location}</li>}
        {lead.notes && <li>Notes: {lead.notes}</li>}
      </ul>
      <p>
        Advisor: {lead.assignedAdvisor?.name ?? "Unassigned"} · Closer: {lead.assignedCloser?.name ?? "—"}
      </p>
      {lead.status === "IN_SEQUENCE" && (
        <p>
          Current step: {currentStepRecord?.actionType ?? "—"}
          {lead.nextDueAt && (
            <>
              {" "}
              — due <LocalDateTime iso={lead.nextDueAt} />
            </>
          )}
        </p>
      )}

      {showHandoff && <HandoffForm leadId={lead.id} closers={closers} />}
      {canLogAdvisorActivity && currentStepRecord && (
        <ActivityForm leadId={lead.id} type={currentStepRecord.actionType} />
      )}
      {canLogCloserActivity && <CloserActivityForm leadId={lead.id} />}

      <h2>Activity timeline</h2>
      <ul>
        {lead.activities.map((activity) => (
          <li key={activity.id}>
            <LocalDateTime iso={activity.completedAt ?? activity.createdAt} /> — {activity.user.name} —{" "}
            {activity.type} — {activity.outcome}
            {activity.notes ? ` — "${activity.notes}"` : ""}
          </li>
        ))}
        {lead.activities.length === 0 && <li>No activity logged yet.</li>}
      </ul>
    </main>
  );
}
