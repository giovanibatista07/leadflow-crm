"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { signUpSchema } from "@/lib/validation/auth";
import { DEFAULT_ROLES } from "@/lib/auth/default-roles";

export type SignUpResult = { error: string } | { success: true; message: string };

export async function signUpOwner(formData: FormData): Promise<SignUpResult> {
  const parsed = signUpSchema.safeParse({
    name: formData.get("name"),
    companyName: formData.get("companyName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { name, companyName, email, password } = parsed.data;

  const domainMatch = /@(.+)$/.exec(email);
  const emailDomain = domainMatch?.[1];
  if (!emailDomain) {
    return { error: "Invalid email address" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return { error: error.message };
  }
  if (!data.user) {
    return { error: "Sign-up did not return a user" };
  }

  const authUserId = data.user.id;

  try {
    await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: { name: companyName, emailDomain },
      });

      const roles = await Promise.all(
        DEFAULT_ROLES.map((role) =>
          tx.role.create({
            data: {
              companyId: company.id,
              name: role.name,
              permissions: [...role.permissions],
              isDefault: true,
            },
          }),
        ),
      );

      const ownerRole = roles.find((r) => r.name === "owner");
      if (!ownerRole) {
        throw new Error("Owner role was not created");
      }

      await tx.user.create({
        data: {
          id: authUserId,
          name,
          email,
          companyId: company.id,
          roleId: ownerRole.id,
        },
      });

      await tx.company.update({
        where: { id: company.id },
        data: { ownerId: authUserId },
      });

      await tx.auditLog.create({
        data: {
          companyId: company.id,
          userId: authUserId,
          action: "company_created",
          targetType: "company",
          targetId: company.id,
        },
      });
    });
  } catch (dbError) {
    // The Auth user now exists without a matching company/profile row.
    // Clean it up so the person can retry signup with the same email.
    await createAdminClient()
      .auth.admin.deleteUser(authUserId)
      .catch(() => {});
    const message = dbError instanceof Error ? dbError.message : "Could not create your company";
    return { error: message };
  }

  if (data.session) {
    redirect("/dashboard");
  }

  return {
    success: true,
    message: "Check your email to confirm your account before signing in.",
  };
}
