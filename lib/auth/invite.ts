import { createHash, randomBytes } from "node:crypto";

export * from "./invite-status";

/** A fresh raw token (goes in the invite link) and its hash (stored in the DB). */
export function generateInviteToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("hex");
  return { token, tokenHash: hashInviteToken(token) };
}

export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
