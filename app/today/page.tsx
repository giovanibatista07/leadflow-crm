import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { LocalDateTime } from "@/components/local-date-time";
import { ActivityForm } from "./activity-form";

export default async function TodayPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (!hasPermission(user, "view_own_leads")) {
    redirect("/dashboard");
  }

  // "Due today or overdue" (SPEC.md section 5) -- an approximation using
  // the UTC calendar day, since there's no stored per-user time zone yet.
  const endOfToday = new Date();
  endOfToday.setUTCHours(23, 59, 59, 999);

  const [leads, defaultCadence] = await Promise.all([
    prisma.lead.findMany({
      where: {
        companyId: user.companyId,
        assignedAdvisorId: user.id,
        status: "IN_SEQUENCE",
        nextDueAt: { lte: endOfToday },
      },
      orderBy: { nextDueAt: "asc" },
    }),
    prisma.cadence.findFirst({
      where: { companyId: user.companyId, isDefault: true },
      include: { steps: true },
    }),
  ]);

  const stepByOrder = new Map((defaultCadence?.steps ?? []).map((s) => [s.order, s]));

  return (
    <main>
      <p>
        <Link href="/dashboard">Back to dashboard</Link>
      </p>
      <h1>Today queue</h1>

      {leads.length === 0 && <p>Nothing due. Nice work.</p>}

      <ul>
        {leads.map((lead) => {
          const step = stepByOrder.get(lead.currentStep);
          return (
            <li key={lead.id}>
              <strong>
                {lead.firstName} {lead.lastName}
              </strong>{" "}
              — {step?.actionType ?? "Follow up"} — due{" "}
              {lead.nextDueAt ? <LocalDateTime iso={lead.nextDueAt} /> : "now"}
              {step?.templateText && <p>{step.templateText}</p>}
              <ActivityForm leadId={lead.id} type={step?.actionType ?? "CUSTOM"} />
            </li>
          );
        })}
      </ul>
    </main>
  );
}
