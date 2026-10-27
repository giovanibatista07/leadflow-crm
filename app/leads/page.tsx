import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { LeadRow } from "./lead-row";

export default async function LeadsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const canViewAll = hasPermission(user, "view_all_leads");
  const canReassign = hasPermission(user, "reassign_leads");
  const canHandoff = hasPermission(user, "handoff_to_closer") || canReassign;

  const where = canViewAll
    ? { companyId: user.companyId }
    : hasPermission(user, "view_assigned_leads")
      ? { companyId: user.companyId, assignedCloserId: user.id }
      : { companyId: user.companyId, assignedAdvisorId: user.id };

  const [leads, advisors, closers] = await Promise.all([
    prisma.lead.findMany({
      where,
      include: {
        assignedAdvisor: { select: { id: true, name: true } },
        assignedCloser: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    canReassign
      ? prisma.user.findMany({
          where: { companyId: user.companyId, active: true, role: { name: "advisor" } },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
    canHandoff
      ? prisma.user.findMany({
          where: { companyId: user.companyId, active: true, role: { name: "closer" } },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);

  return (
    <main>
      <p>
        <Link href="/dashboard">Back to dashboard</Link>
      </p>
      <h1>Leads</h1>

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Status</th>
            <th>Source</th>
            <th>Advisor</th>
            <th>Closer</th>
            {(canReassign || canHandoff) && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <LeadRow
              key={lead.id}
              lead={{
                id: lead.id,
                name: `${lead.firstName} ${lead.lastName}`,
                status: lead.status,
                source: lead.source,
                assignedAdvisorId: lead.assignedAdvisorId,
                advisorName: lead.assignedAdvisor?.name ?? null,
                closerName: lead.assignedCloser?.name ?? null,
              }}
              advisors={advisors}
              closers={closers}
              canReassign={canReassign}
              canHandoff={canHandoff && (canReassign || lead.assignedAdvisorId === user.id)}
            />
          ))}
        </tbody>
      </table>
      {leads.length === 0 && <p>No leads yet.</p>}
    </main>
  );
}
