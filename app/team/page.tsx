import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { canManageRolesAndInvites } from "@/lib/auth/permissions";
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
    <main>
      <p>
        <Link href="/dashboard">Back to dashboard</Link>
      </p>
      <h1>Team</h1>

      <h2>Roles</h2>
      <ul>
        {roles.map((role) => (
          <li key={role.id}>
            {role.name} {role.isDefault ? "(default)" : "(custom)"} —{" "}
            {(role.permissions as string[]).join(", ")}
          </li>
        ))}
      </ul>

      {canManage && (
        <>
          <h3>Create a custom role</h3>
          <RoleForm />

          <h2>Invite someone</h2>
          <InviteForm roles={roles} companyEmailDomain={user.companyEmailDomain} />

          <h2>Pending invites</h2>
          <InviteList invites={invites} />
        </>
      )}

      {user.roleName === "owner" && (
        <>
          <h2>Manager permissions</h2>
          <DelegationForm initiallyEnabled={user.managersCanManageRolesAndInvites} />
        </>
      )}
    </main>
  );
}
