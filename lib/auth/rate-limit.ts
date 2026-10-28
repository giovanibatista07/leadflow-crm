import "server-only";
import { prisma } from "@/lib/db";

// CLAUDE.md: "Rate limiting on sign-in and invites; alerts on repeated
// failed logins."
const LOGIN_WINDOW_MINUTES = 15;
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_ALERT_THRESHOLD = 10;

const INVITE_WINDOW_MINUTES = 60;
const INVITE_MAX_PER_WINDOW = 20;

/** True when this email has failed to log in too many times recently. */
export async function isLoginRateLimited(email: string): Promise<boolean> {
  const since = new Date(Date.now() - LOGIN_WINDOW_MINUTES * 60_000);
  const count = await prisma.failedLoginAttempt.count({ where: { email, createdAt: { gte: since } } });
  return count >= LOGIN_MAX_ATTEMPTS;
}

/**
 * Records a failed attempt, and once it's happened enough times, leaves an
 * audit trail a manager/owner can actually see (there's no email alerting
 * in this app). Scoped to the matching company when the email belongs to a
 * real user; a flood of attempts against a nonexistent address has no
 * company to notify.
 */
export async function recordFailedLogin(email: string): Promise<void> {
  await prisma.failedLoginAttempt.create({ data: { email } });

  const since = new Date(Date.now() - LOGIN_WINDOW_MINUTES * 60_000);
  const count = await prisma.failedLoginAttempt.count({ where: { email, createdAt: { gte: since } } });
  if (count !== LOGIN_ALERT_THRESHOLD) return;

  const user = await prisma.user.findUnique({ where: { email }, select: { companyId: true } });
  if (!user) return;

  await prisma.auditLog.create({
    data: {
      companyId: user.companyId,
      userId: null,
      action: "repeated_failed_logins",
      targetType: "user",
    },
  });
}

/** Clears this email's recent failures once they do log in successfully. */
export async function clearFailedLogins(email: string): Promise<void> {
  await prisma.failedLoginAttempt.deleteMany({ where: { email } });
}

/** True when this manager/owner has sent too many invites recently. */
export async function isInviteRateLimited(invitedById: string): Promise<boolean> {
  const since = new Date(Date.now() - INVITE_WINDOW_MINUTES * 60_000);
  const count = await prisma.invite.count({ where: { invitedById, createdAt: { gte: since } } });
  return count >= INVITE_MAX_PER_WINDOW;
}
