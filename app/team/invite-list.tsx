"use client";

import { useState, useTransition } from "react";
import { getInviteStatus, type InviteStatus } from "@/lib/auth/invite";
import { revokeInvite } from "./actions";

type InviteRow = {
  id: string;
  email: string;
  expiresAt: Date;
  acceptedAt: Date | null;
  revokedAt: Date | null;
  role: { name: string };
};

export function InviteList({ invites }: { invites: InviteRow[] }) {
  return (
    <ul>
      {invites.map((invite) => (
        <InviteRowItem key={invite.id} invite={invite} />
      ))}
    </ul>
  );
}

function InviteRowItem({ invite }: { invite: InviteRow }) {
  const [status, setStatus] = useState<InviteStatus>(getInviteStatus(invite));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleRevoke() {
    const formData = new FormData();
    formData.set("inviteId", invite.id);
    startTransition(async () => {
      const result = await revokeInvite(formData);
      if (result && "error" in result) {
        setError(result.error);
      } else {
        setStatus("revoked");
      }
    });
  }

  return (
    <li>
      {invite.email} — {invite.role.name} — {status}
      {status === "valid" && (
        <button type="button" onClick={handleRevoke} disabled={isPending}>
          {isPending ? "Revoking..." : "Revoke"}
        </button>
      )}
      {error && <span role="alert"> {error}</span>}
    </li>
  );
}
