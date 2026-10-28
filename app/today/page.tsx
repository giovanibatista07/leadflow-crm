import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { LocalDateTime } from "@/components/local-date-time";
import { AppShell } from "@/components/app-shell";
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
    <AppShell user={user}>
      <main>
        <h1>Today queue</h1>

        {leads.length === 0 && <p className="mt-4">Nothing due. Nice work.</p>}

        <ul className="mt-6 space-y-4">
          {leads.map((lead) => {
            const step = stepByOrder.get(lead.currentStep);
            return (
              <li key={lead.id} className="card">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong className="text-slate-900">
                    {lead.firstName} {lead.lastName}
                  </strong>
                  <span className="text-sm text-slate-500">
                    due {lead.nextDueAt ? <LocalDateTime iso={lead.nextDueAt} /> : "now"}
                  </span>
                </div>
                <p className="mt-1">
                  <span className="badge badge-brand">{step?.actionType ?? "Follow up"}</span>
                </p>
                {step?.templateText && <p className="mt-2 text-slate-600">{step.templateText}</p>}
                <div className="mt-3 border-t border-slate-100 pt-3">
                  <ActivityForm leadId={lead.id} type={step?.actionType ?? "CUSTOM"} />
                </div>
              </li>
            );
          })}
        </ul>
      </main>
    </AppShell>
  );
}
