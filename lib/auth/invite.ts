import { createHash, randomBytes } from "node:crypto";

export const INVITE_TTL_HOURS = 72;

/** A fresh raw token (goes in the invite link) and its hash (stored in the DB). */
export function generateInviteToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("hex");
  return { token, tokenHash: hashInviteToken(token) };
}

export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function inviteExpiryDate(from: Date = new Date()): Date {
  return new Date(from.getTime() + INVITE_TTL_HOURS * 60 * 60 * 1000);
}

/** SPEC.md: invites only go to addresses on the company's email domain. */
export function isEmailOnCompanyDomain(email: string, companyEmailDomain: string): boolean {
  const domainMatch = /@(.+)$/.exec(email.trim().toLowerCase());
  const domain = domainMatch?.[1];
  return domain === companyEmailDomain.trim().toLowerCase();
}

export type InviteStatus = "valid" | "expired" | "accepted" | "revoked";

export function getInviteStatus(
  invite: { expiresAt: Date; acceptedAt: Date | null; revokedAt: Date | null },
  now: Date = new Date(),
): InviteStatus {
  if (invite.revokedAt) return "revoked";
  if (invite.acceptedAt) return "accepted";
  if (invite.expiresAt.getTime() <= now.getTime()) return "expired";
  return "valid";
}
