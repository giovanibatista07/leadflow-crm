import { describe, expect, it } from "vitest";
import {
  assertCanChangeRole,
  assertCanDeactivateUser,
  assertCanRemoveUser,
  hasPermission,
  isManagerOrOwner,
  OwnerProtectionError,
  PermissionError,
  requirePermission,
  type AuthenticatedUser,
} from "@/lib/auth/permissions";

function user(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    id: "user-1",
    companyId: "company-1",
    roleId: "role-1",
    roleName: "advisor",
    permissions: ["view_own_leads"],
    active: true,
    ...overrides,
  };
}

describe("hasPermission", () => {
  it("grants everything to a wildcard permission", () => {
    expect(hasPermission(user({ permissions: ["*"] }), "anything")).toBe(true);
  });

  it("grants only listed capabilities otherwise", () => {
    const advisor = user({ permissions: ["view_own_leads"] });
    expect(hasPermission(advisor, "view_own_leads")).toBe(true);
    expect(hasPermission(advisor, "manage_cadence")).toBe(false);
  });
});

describe("isManagerOrOwner", () => {
  it("is true for owner and manager", () => {
    expect(isManagerOrOwner(user({ roleName: "owner" }))).toBe(true);
    expect(isManagerOrOwner(user({ roleName: "manager" }))).toBe(true);
  });

  it("is false for advisor and closer", () => {
    expect(isManagerOrOwner(user({ roleName: "advisor" }))).toBe(false);
    expect(isManagerOrOwner(user({ roleName: "closer" }))).toBe(false);
  });
});

describe("requirePermission", () => {
  it("throws for a deactivated account regardless of permissions", () => {
    const inactive = user({ permissions: ["*"], active: false });
    expect(() => requirePermission(inactive, "anything")).toThrow(PermissionError);
  });

  it("throws when the capability is missing", () => {
    expect(() => requirePermission(user({ permissions: [] }), "manage_cadence")).toThrow(
      PermissionError,
    );
  });

  it("passes when the capability is present", () => {
    expect(() => requirePermission(user({ permissions: ["manage_cadence"] }), "manage_cadence")).not.toThrow();
  });
});

describe("owner protection invariants", () => {
  const ownerId = "owner-user-1";

  it("blocks removing the owner", () => {
    expect(() => assertCanRemoveUser(ownerId, ownerId)).toThrow(OwnerProtectionError);
  });

  it("allows removing a non-owner", () => {
    expect(() => assertCanRemoveUser("someone-else", ownerId)).not.toThrow();
  });

  it("blocks deactivating the owner", () => {
    expect(() => assertCanDeactivateUser(ownerId, ownerId)).toThrow(OwnerProtectionError);
  });

  it("allows deactivating a non-owner", () => {
    expect(() => assertCanDeactivateUser("someone-else", ownerId)).not.toThrow();
  });

  it("blocks changing the owner's role to anything but owner", () => {
    expect(() => assertCanChangeRole(ownerId, ownerId, "manager")).toThrow(OwnerProtectionError);
  });

  it("allows a no-op role change for the owner", () => {
    expect(() => assertCanChangeRole(ownerId, ownerId, "owner")).not.toThrow();
  });

  it("allows changing a non-owner's role", () => {
    expect(() => assertCanChangeRole("someone-else", ownerId, "closer")).not.toThrow();
  });
});
