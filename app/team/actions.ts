"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { PermissionError, requireManageRolesAndInvites } from "@/lib/auth/permissions";
import { generateInviteToken, inviteExpiryDate, isEmailOnCompanyDomain } from "@/lib/auth/invite";
import { isInviteRateLimited } from "@/lib/auth/rate-limit";
import { createInviteSchema, createRoleSchema } from "@/lib/validation/team";

export type ActionResult = { error: string } | { success: true; message?: string };

async function requireDelegatedUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new PermissionError("Not signed in");
  }
  requireManageRolesAndInvites(user, {
    managersCanManageRolesAndInvites: user.managersCanManageRolesAndInvites,
  });
  return user;
}

export async function createInvite(formData: FormData): Promise<ActionResult> {
  let user;
  try {
    user = await requireDelegatedUser();
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Not allowed" };
  }

  const parsed = createInviteSchema.safeParse({
    email: formData.get("email"),
    roleId: formData.get("roleId"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { email, roleId } = parsed.data;

  if (!isEmailOnCompanyDomain(email, user.companyEmailDomain)) {
    return { error: `Invites can only be sent to addresses on ${user.companyEmailDomain}` };
  }

  if (await isInviteRateLimited(user.id)) {
    return { error: "Too many invites sent recently. Try again later." };
  }

  const role = await prisma.role.findFirst({ where: { id: roleId, companyId: user.companyId } });
  if (!role) {
    return { error: "That role does not exist" };
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return { error: "That person is already a user" };
  }

  const { token, tokenHash } = generateInviteToken();

  await prisma.invite.create({
    data: {
      companyId: user.companyId,
      email,
      roleId,
      invitedById: user.id,
      tokenHash,
      expiresAt: inviteExpiryDate(),
    },
  });

  await prisma.auditLog.create({
    data: {
      companyId: user.companyId,
      userId: user.id,
      action: "invite_created",
      targetType: "invite",
    },
  });

  revalidatePath("/team");

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/invite/${token}`;
  return { success: true, message: `Invite link: ${inviteUrl}` };
}

export async function revokeInvite(formData: FormData): Promise<ActionResult> {
  let user;
  try {
    user = await requireDelegatedUser();
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Not allowed" };
  }

  const inviteId = formData.get("inviteId");
  if (typeof inviteId !== "string") {
    return { error: "Invalid invite" };
  }

  const invite = await prisma.invite.findFirst({
    where: { id: inviteId, companyId: user.companyId },
  });
  if (!invite) {
    return { error: "Invite not found" };
  }

  await prisma.invite.update({ where: { id: invite.id }, data: { revokedAt: new Date() } });

  await prisma.auditLog.create({
    data: {
      companyId: user.companyId,
      userId: user.id,
      action: "invite_revoked",
      targetType: "invite",
      targetId: invite.id,
    },
  });

  revalidatePath("/team");
  return { success: true };
}

export async function createCustomRole(formData: FormData): Promise<ActionResult> {
  let user;
  try {
    user = await requireDelegatedUser();
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Not allowed" };
  }

  const parsed = createRoleSchema.safeParse({
    name: formData.get("name"),
    permissions: formData.getAll("permissions"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { name, permissions } = parsed.data;

  const existing = await prisma.role.findFirst({ where: { companyId: user.companyId, name } });
  if (existing) {
    return { error: "A role with that name already exists" };
  }

  const role = await prisma.role.create({
    data: { companyId: user.companyId, name, permissions, isDefault: false },
  });

  await prisma.auditLog.create({
    data: {
      companyId: user.companyId,
      userId: user.id,
      action: "role_created",
      targetType: "role",
      targetId: role.id,
    },
  });

  revalidatePath("/team");
  return { success: true };
}

/** Owner-only: lets managers create roles and send invites, or revokes that. */
export async function setManagerDelegation(formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "Not signed in" };
  }
  if (user.roleName !== "owner") {
    return { error: "Only the owner can change this setting" };
  }

  const enabled = formData.get("enabled") === "on";

  await prisma.company.update({
    where: { id: user.companyId },
    data: { managersCanManageRolesAndInvites: enabled },
  });

  await prisma.auditLog.create({
    data: {
      companyId: user.companyId,
      userId: user.id,
      action: enabled ? "manager_delegation_enabled" : "manager_delegation_disabled",
      targetType: "company",
      targetId: user.companyId,
    },
  });

  revalidatePath("/team");
  return { success: true };
}
