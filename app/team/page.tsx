import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { canManageRolesAndInvites } from "@/lib/auth/permissions";
import { AppShell } from "@/components/app-shell";
import { InviteForm } from "./invite-form";
import { InviteList } from "./invite-list";
import { RoleForm } from "./role-form";
import { DelegationForm } from "./delegation-form";

export default async function TeamPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const canManage = canManageRolesAndInvites(user, {
    managersCanManageRolesAndInvites: user.managersCanManageRolesAndInvites,
  });

  const [roles, invites] = await Promise.all([
    prisma.role.findMany({ where: { companyId: user.companyId }, orderBy: { createdAt: "asc" } }),
    canManage
      ? prisma.invite.findMany({
          where: { companyId: user.companyId },
          include: { role: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
  ]);

  return (
    <AppShell user={user}>
      <main className="space-y-6">
        <h1>Team</h1>

        <div className="card">
          <h2>Roles</h2>
          <ul className="mt-3 space-y-2">
            {roles.map((role) => (
              <li key={role.id} className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
                <span className="font-medium text-slate-900">{role.name}</span>
                <span className={`badge ${role.isDefault ? "badge-slate" : "badge-brand"}`}>
                  {role.isDefault ? "default" : "custom"}
                </span>
                <span className="text-slate-500">{(role.permissions as string[]).join(", ")}</span>
              </li>
            ))}
          </ul>
        </div>

        {canManage && (
          <>
            <div className="card">
              <h3>Create a custom role</h3>
              <div className="mt-3">
                <RoleForm />
              </div>
            </div>

            <div className="card">
              <h2>Invite someone</h2>
              <div className="mt-3">
                <InviteForm roles={roles} companyEmailDomain={user.companyEmailDomain} />
              </div>
            </div>

            <div className="card">
              <h2>Pending invites</h2>
              <div className="mt-3">
                <InviteList invites={invites} />
              </div>
            </div>
          </>
        )}

        {user.roleName === "owner" && (
          <div className="card">
            <h2>Manager permissions</h2>
            <div className="mt-3">
              <DelegationForm initiallyEnabled={user.managersCanManageRolesAndInvites} />
            </div>
          </div>
        )}
      </main>
    </AppShell>
  );
}
