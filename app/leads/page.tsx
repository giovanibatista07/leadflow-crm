import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { buildLeadWhere } from "@/lib/leads/filters";
import { LEAD_STATUSES, parseLeadFilters, type LeadFilters } from "@/lib/validation/search";
import { LeadRow } from "./lead-row";
import { SavedViews } from "./saved-views";

/** Builds the query string for a given filter set, used by saved-view links. */
function filtersToQueryString(filters: LeadFilters): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  return params.toString();
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const rawParams = await searchParams;
  const filters = parseLeadFilters(rawParams);

  const canViewAll = hasPermission(user, "view_all_leads");
  const canReassign = hasPermission(user, "reassign_leads");
  const canHandoff = hasPermission(user, "handoff_to_closer") || canReassign;

  const scope = canViewAll
    ? { companyId: user.companyId }
    : hasPermission(user, "view_assigned_leads")
      ? { companyId: user.companyId, assignedCloserId: user.id }
      : { companyId: user.companyId, assignedAdvisorId: user.id };

  const [leads, advisors, closers, savedViews] = await Promise.all([
    prisma.lead.findMany({
      where: buildLeadWhere(scope, filters),
      include: {
        assignedAdvisor: { select: { id: true, name: true } },
        assignedCloser: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.user.findMany({
      where: { companyId: user.companyId, active: true, role: { name: "advisor" } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { companyId: user.companyId, active: true, role: { name: "closer" } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.savedView.findMany({
      where: { userId: user.id },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <main>
      <p>
        <Link href="/dashboard">Back to dashboard</Link>
      </p>
      <h1>Leads</h1>

      <form method="get">
        <input type="text" name="q" placeholder="Search name, email, phone, sport, position" defaultValue={filters.q ?? ""} />
        <select name="status" defaultValue={filters.status ?? ""}>
          <option value="">Any status</option>
          {LEAD_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <input type="number" name="step" placeholder="Step" min={1} defaultValue={filters.step ?? ""} />
        <select name="advisorId" defaultValue={filters.advisorId ?? ""}>
          <option value="">Any advisor</option>
          {advisors.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <select name="closerId" defaultValue={filters.closerId ?? ""}>
          <option value="">Any closer</option>
          {closers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <input type="text" name="source" placeholder="Source" defaultValue={filters.source ?? ""} />
        <label>
          Due after
          <input type="date" name="dueAfter" defaultValue={filters.dueAfter ?? ""} />
        </label>
        <label>
          Due before
          <input type="date" name="dueBefore" defaultValue={filters.dueBefore ?? ""} />
        </label>
        <button type="submit">Search</button>
        <Link href="/leads">Clear</Link>
      </form>

      <SavedViews views={savedViews} currentQueryString={filtersToQueryString(filters)} />

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
      {leads.length === 0 && <p>No leads match.</p>}
    </main>
  );
}
