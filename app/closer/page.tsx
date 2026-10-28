import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { CloserQuickActions } from "./closer-quick-actions";

const COLUMNS = [
  { status: "WITH_CLOSER", label: "With Closer" },
  { status: "WON", label: "Won" },
  { status: "LOST", label: "Lost" },
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
    <main>
      <p>
        <Link href="/dashboard">Back to dashboard</Link>
      </p>
      <h1>Closer board</h1>

      <div style={{ display: "flex", gap: "2rem" }}>
        {COLUMNS.map((column) => (
          <section key={column.status}>
            <h2>
              {column.label} ({byStatus.get(column.status)?.length ?? 0})
            </h2>
            <ul>
              {byStatus.get(column.status)?.map((lead) => (
                <li key={lead.id}>
                  <Link href={`/leads/${lead.id}`}>
                    {lead.firstName} {lead.lastName}
                  </Link>{" "}
                  ({lead.source})
                  {column.status === "WITH_CLOSER" && <CloserQuickActions leadId={lead.id} />}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
