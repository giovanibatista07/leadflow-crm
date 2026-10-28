"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getInviteStatus, hashInviteToken } from "@/lib/auth/invite";
import { acceptInviteSchema } from "@/lib/validation/team";

export type AcceptInviteResult = { error: string } | undefined;

export async function acceptInvite(formData: FormData): Promise<AcceptInviteResult> {
  const parsed = acceptInviteSchema.safeParse({
    token: formData.get("token"),
    name: formData.get("name"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { token, name, password } = parsed.data;

  const invite = await prisma.invite.findUnique({ where: { tokenHash: hashInviteToken(token) } });
  if (!invite || getInviteStatus(invite) !== "valid") {
    return { error: "This invite link is no longer valid" };
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email: invite.email,
    password,
    email_confirm: true,
  });

  if (error) {
    return { error: error.message };
  }
  if (!data.user) {
    return { error: "Could not create your account" };
  }

  const authUserId = data.user.id;

  try {
    await prisma.$transaction(
      async (tx) => {
        await tx.user.create({
          data: {
            id: authUserId,
            name,
            email: invite.email,
            companyId: invite.companyId,
            roleId: invite.roleId,
          },
        });

        await tx.invite.update({
          where: { id: invite.id },
          data: { acceptedAt: new Date() },
        });

        await tx.auditLog.create({
          data: {
            companyId: invite.companyId,
            userId: authUserId,
            action: "invite_accepted",
            targetType: "invite",
            targetId: invite.id,
          },
        });
      },
      { timeout: 20000 },
    );
  } catch (dbError) {
    await admin.auth.admin.deleteUser(authUserId).catch(() => {});
    const message = dbError instanceof Error ? dbError.message : "Could not finish creating your account";
    return { error: message };
  }

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: invite.email,
    password,
  });

  if (signInError) {
    redirect("/login");
  }

  redirect("/dashboard");
}
