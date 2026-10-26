import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
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
      </p>
      <form action={logOut}>
        <button type="submit">Log out</button>
      </form>
    </main>
  );
}
