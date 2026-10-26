export type AuthenticatedUser = {
  id: string;
  companyId: string;
  roleId: string;
  roleName: string;
  permissions: string[];
  active: boolean;
};

export class PermissionError extends Error {}
export class OwnerProtectionError extends Error {}

export function hasPermission(user: AuthenticatedUser, capability: string): boolean {
  return user.permissions.includes("*") || user.permissions.includes(capability);
}

export function isManagerOrOwner(user: AuthenticatedUser): boolean {
  return user.roleName === "owner" || user.roleName === "manager";
}

/** Throws unless `user` has `capability`. Call this first in every server action/API route. */
export function requirePermission(user: AuthenticatedUser, capability: string): void {
  if (!user.active) {
    throw new PermissionError("This account has been deactivated");
  }
  if (!hasPermission(user, capability)) {
    throw new PermissionError(`Missing permission: ${capability}`);
  }
}

/**
 * Owner-protection invariants (CLAUDE.md "Owner rules" -- never breakable):
 * exactly one owner per company, and no code path may remove, demote, or
 * lock out the owner. Ownership only changes via an owner-initiated
 * transfer, which is a separate, explicit operation -- not these guards.
 */

export function assertCanRemoveUser(targetUserId: string, companyOwnerId: string | null): void {
  if (targetUserId === companyOwnerId) {
    throw new OwnerProtectionError("The company owner cannot be removed");
  }
}

export function assertCanDeactivateUser(targetUserId: string, companyOwnerId: string | null): void {
  if (targetUserId === companyOwnerId) {
    throw new OwnerProtectionError("The company owner cannot be deactivated");
  }
}

export function assertCanChangeRole(
  targetUserId: string,
  companyOwnerId: string | null,
  newRoleName: string,
): void {
  if (targetUserId === companyOwnerId && newRoleName !== "owner") {
    throw new OwnerProtectionError(
      "The company owner's role cannot be changed; transfer ownership instead",
    );
  }
}
