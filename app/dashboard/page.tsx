import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { logOut } from "@/app/login/actions";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const [unreadNotifications, googleConnection] = await Promise.all([
    prisma.notification.count({ where: { userId: user.id, readAt: null } }),
    prisma.googleConnection.findUnique({ where: { userId: user.id } }),
  ]);

  return (
    <main>
      <h1>Welcome, {user.name}</h1>
      <p>
        Role: {user.roleName} · Company ID: {user.companyId}
      </p>
      <p>
        <Link href="/team">Team</Link>
        {hasPermission(user, "import_leads") && (
          <>
            {" · "}
            <Link href="/import">Import leads</Link>
          </>
        )}
        {hasPermission(user, "manage_cadence") && (
          <>
            {" · "}
            <Link href="/cadence">Cadences</Link>
          </>
        )}
        {" · "}
        <Link href="/leads">Leads</Link>
        {hasPermission(user, "view_own_leads") && (
          <>
            {" · "}
            <Link href="/today">Today queue</Link>
          </>
        )}
        {(hasPermission(user, "set_won_lost") || hasPermission(user, "view_all_leads")) && (
          <>
            {" · "}
            <Link href="/closer">Closer board</Link>
          </>
        )}
        {" · "}
        <Link href="/notifications">
          Notifications{unreadNotifications > 0 ? ` (${unreadNotifications})` : ""}
        </Link>
      </p>
      <p>
        {googleConnection ? (
          "Google connected (Sheets import, Calendar sync)"
        ) : (
          <a href="/api/google/connect">Connect Google (for Sheets import and Calendar sync)</a>
        )}
      </p>
      <form action={logOut}>
        <button type="submit">Log out</button>
      </form>
    </main>
  );
}
