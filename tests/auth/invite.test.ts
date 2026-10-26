import { describe, expect, it } from "vitest";
import {
  generateInviteToken,
  getInviteStatus,
  hashInviteToken,
  inviteExpiryDate,
  isEmailOnCompanyDomain,
} from "@/lib/auth/invite";

describe("generateInviteToken", () => {
  it("produces a token whose hash matches hashInviteToken", () => {
    const { token, tokenHash } = generateInviteToken();
    expect(hashInviteToken(token)).toBe(tokenHash);
  });

  it("produces a different token each time", () => {
    const a = generateInviteToken();
    const b = generateInviteToken();
    expect(a.token).not.toBe(b.token);
    expect(a.tokenHash).not.toBe(b.tokenHash);
  });
});

describe("isEmailOnCompanyDomain", () => {
  it("accepts an address on the company's domain", () => {
    expect(isEmailOnCompanyDomain("advisor@acme.com", "acme.com")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(isEmailOnCompanyDomain("Advisor@ACME.com", "acme.com")).toBe(true);
  });

  it("blocks a different domain, including personal email", () => {
    expect(isEmailOnCompanyDomain("someone@gmail.com", "acme.com")).toBe(false);
  });
});

describe("inviteExpiryDate", () => {
  it("is 72 hours after the given time", () => {
    const from = new Date("2026-01-01T00:00:00.000Z");
    const expiry = inviteExpiryDate(from);
    expect(expiry.getTime() - from.getTime()).toBe(72 * 60 * 60 * 1000);
  });
});

describe("getInviteStatus", () => {
  const now = new Date("2026-01-04T00:00:00.000Z");
  const future = new Date("2026-01-05T00:00:00.000Z");
  const past = new Date("2026-01-03T00:00:00.000Z");

  it("is valid when unexpired, unaccepted, and unrevoked", () => {
    expect(getInviteStatus({ expiresAt: future, acceptedAt: null, revokedAt: null }, now)).toBe(
      "valid",
    );
  });

  it("is expired once past its expiry, even without acceptedAt", () => {
    expect(getInviteStatus({ expiresAt: past, acceptedAt: null, revokedAt: null }, now)).toBe(
      "expired",
    );
  });

  it("is accepted once used, even if still within its expiry window", () => {
    expect(getInviteStatus({ expiresAt: future, acceptedAt: past, revokedAt: null }, now)).toBe(
      "accepted",
    );
  });

  it("is revoked when revoked, taking priority over every other state", () => {
    expect(
      getInviteStatus({ expiresAt: future, acceptedAt: past, revokedAt: past }, now),
    ).toBe("revoked");
  });
});
