import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { AppShell } from "@/components/app-shell";
import { CloserQuickActions } from "./closer-quick-actions";

const COLUMNS = [
  { status: "WITH_CLOSER", label: "With Closer", badge: "badge-brand" },
  { status: "WON", label: "Won", badge: "badge-green" },
  { status: "LOST", label: "Lost", badge: "badge-red" },
] as const;

export default async function CloserBoardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (!hasPermission(user, "set_won_lost") && !hasPermission(user, "view_all_leads")) {
    redirect("/dashboard");
  }

  const canViewAll = hasPermission(user, "view_all_leads");
  const where = canViewAll
    ? { companyId: user.companyId, status: { in: COLUMNS.map((c) => c.status) } }
    : { companyId: user.companyId, assignedCloserId: user.id, status: { in: COLUMNS.map((c) => c.status) } };

  const leads = await prisma.lead.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: { id: true, firstName: true, lastName: true, source: true, status: true },
  });

  const byStatus = new Map(COLUMNS.map((c) => [c.status, leads.filter((l) => l.status === c.status)]));

  return (
    <AppShell user={user}>
      <main>
        <h1>Closer board</h1>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          {COLUMNS.map((column) => (
            <section key={column.status} className="card">
              <h2 className="flex items-center gap-2">
                {column.label}
                <span className={`badge ${column.badge}`}>{byStatus.get(column.status)?.length ?? 0}</span>
              </h2>
              <ul className="mt-3 space-y-2">
                {byStatus.get(column.status)?.map((lead) => (
                  <li key={lead.id} className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
                    <Link href={`/leads/${lead.id}`} className="font-medium">
                      {lead.firstName} {lead.lastName}
                    </Link>{" "}
                    <span className="text-slate-500">({lead.source})</span>
                    {column.status === "WITH_CLOSER" && (
                      <div className="mt-2">
                        <CloserQuickActions leadId={lead.id} />
                      </div>
                    )}
                  </li>
                ))}
                {byStatus.get(column.status)?.length === 0 && (
                  <li className="text-sm text-slate-400">No leads</li>
                )}
              </ul>
            </section>
          ))}
        </div>
      </main>
    </AppShell>
  );
}
