import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { AppShell } from "@/components/app-shell";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const googleConnection = await prisma.googleConnection.findUnique({ where: { userId: user.id } });

  return (
    <AppShell user={user}>
      <main>
        <h1>Welcome, {user.name}</h1>
        <p className="mt-1">
          Role: <span className="font-medium text-slate-700">{user.roleName}</span>
        </p>

        <div className="card mt-6">
          <h2>Google</h2>
          <p className="mt-2">
            {googleConnection ? (
              <span className="badge badge-green">Connected — Sheets import, Calendar sync</span>
            ) : (
              <a href="/api/google/connect">Connect Google (for Sheets import and Calendar sync)</a>
            )}
          </p>
        </div>
      </main>
    </AppShell>
  );
}
