import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { isManagerOrOwner } from "@/lib/auth/permissions";
import { LocalDateTime } from "@/components/local-date-time";

export default async function AuditLogPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  // Matches the audit_logs RLS policy (is_manager_or_owner()): role-based,
  // not capability-based, since that policy checks the role name directly.
  if (!isManagerOrOwner(user)) {
    redirect("/dashboard");
  }

  const entries = await prisma.auditLog.findMany({
    where: { companyId: user.companyId },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <main>
      <p>
        <Link href="/dashboard">Back to dashboard</Link>
      </p>
      <h1>Audit log</h1>

      <table>
        <thead>
          <tr>
            <th>When</th>
            <th>Who</th>
            <th>Action</th>
            <th>Target</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id}>
              <td>
                <LocalDateTime iso={entry.createdAt} />
              </td>
              <td>{entry.user?.name ?? "System"}</td>
              <td>{entry.action}</td>
              <td>
                {entry.targetType === "lead" && entry.targetId ? (
                  <Link href={`/leads/${entry.targetId}`}>{entry.targetType}</Link>
                ) : (
                  <>
                    {entry.targetType}
                    {entry.targetId ? ` (${entry.targetId})` : ""}
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {entries.length === 0 && <p>No audit log entries yet.</p>}
    </main>
  );
}
