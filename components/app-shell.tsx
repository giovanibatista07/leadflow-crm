import Link from "next/link";
import { prisma } from "@/lib/db";
import { hasPermission, isManagerOrOwner, type AuthenticatedUser } from "@/lib/auth/permissions";
import { logOut } from "@/app/login/actions";

/**
 * Shared top nav for every authenticated page. Renders its own unread-count
 * query so pages don't each have to fetch and thread it through.
 */
export async function AppShell({
  user,
  children,
}: {
  user: AuthenticatedUser;
  children: React.ReactNode;
}) {
  const unreadCount = await prisma.notification.count({
    where: { userId: user.id, readAt: null },
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-1 px-4 py-3 sm:px-6">
          <Link href="/dashboard" className="mr-3 text-base font-semibold text-slate-900 hover:no-underline">
            LeadFlow
          </Link>
          <nav className="flex flex-wrap items-center gap-1">
            <Link href="/leads" className="topnav-link">
              Leads
            </Link>
            {hasPermission(user, "view_own_leads") && (
              <Link href="/today" className="topnav-link">
                Today
              </Link>
            )}
            {(hasPermission(user, "set_won_lost") || hasPermission(user, "view_all_leads")) && (
              <Link href="/closer" className="topnav-link">
                Closer board
              </Link>
            )}
            {hasPermission(user, "manage_cadence") && (
              <Link href="/cadence" className="topnav-link">
                Cadences
              </Link>
            )}
            {hasPermission(user, "import_leads") && (
              <Link href="/import" className="topnav-link">
                Import
              </Link>
            )}
            <Link href="/team" className="topnav-link">
              Team
            </Link>
            {isManagerOrOwner(user) && (
              <Link href="/audit-log" className="topnav-link">
                Audit log
              </Link>
            )}
            <Link href="/notifications" className="topnav-link">
              Notifications{unreadCount > 0 ? ` (${unreadCount})` : ""}
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-sm text-slate-500 sm:inline">{user.roleName}</span>
            <form action={logOut}>
              <button
                type="submit"
                className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
              >
                Log out
              </button>
            </form>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
