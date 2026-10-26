import { prisma } from "@/lib/db";
import { getInviteStatus, hashInviteToken } from "@/lib/auth/invite";
import { AcceptInviteForm } from "./accept-form";

export default async function AcceptInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invite = await prisma.invite.findUnique({
    where: { tokenHash: hashInviteToken(token) },
    include: { company: { select: { name: true } }, role: { select: { name: true } } },
  });

  const status = invite ? getInviteStatus(invite) : null;

  if (!invite || status !== "valid") {
    return (
      <main>
        <h1>Invite link not valid</h1>
        <p>
          {status === "accepted"
            ? "This invite has already been used."
            : status === "revoked"
              ? "This invite has been cancelled."
              : "This invite link has expired or does not exist. Ask whoever invited you to send a new one."}
        </p>
      </main>
    );
  }

  return (
    <main>
      <h1>Join {invite.company.name}</h1>
      <p>You&apos;ve been invited as {invite.role.name}.</p>
      <AcceptInviteForm token={token} email={invite.email} />
    </main>
  );
}
