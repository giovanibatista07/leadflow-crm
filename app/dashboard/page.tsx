import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { logOut } from "@/app/login/actions";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

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
      </p>
      <form action={logOut}>
        <button type="submit">Log out</button>
      </form>
    </main>
  );
}
