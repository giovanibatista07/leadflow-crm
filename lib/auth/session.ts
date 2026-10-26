import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import type { AuthenticatedUser } from "@/lib/auth/permissions";

/**
 * The current signed-in user, joined with their role's permissions and
 * their company's owner_id -- or null if no one is signed in. Supabase's
 * `auth.getUser()` re-validates the session against the Auth server rather
 * than trusting the cookie, so this is safe to use for access checks.
 */
export async function getCurrentUser(): Promise<
  (AuthenticatedUser & { name: string; email: string; companyId: string; companyOwnerId: string | null }) | null
> {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  const user = await prisma.user.findUnique({
    where: { id: authUser.id },
    include: { role: true, company: { select: { ownerId: true } } },
  });

  if (!user) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    companyId: user.companyId,
    companyOwnerId: user.company.ownerId,
    roleId: user.roleId,
    roleName: user.role.name,
    permissions: user.role.permissions as string[],
    active: user.active,
  };
}
