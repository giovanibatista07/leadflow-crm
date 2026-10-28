"use client";

import { useState, useTransition } from "react";
import { getInviteStatus, type InviteStatus } from "@/lib/auth/invite-status";
import { revokeInvite } from "./actions";

type InviteRow = {
  id: string;
  email: string;
  expiresAt: Date;
  acceptedAt: Date | null;
  revokedAt: Date | null;
  role: { name: string };
};

const STATUS_BADGE: Record<InviteStatus, string> = {
  valid: "badge-brand",
  accepted: "badge-green",
  expired: "badge-slate",
  revoked: "badge-red",
};

export function InviteList({ invites }: { invites: InviteRow[] }) {
  if (invites.length === 0) {
    return <p>No invites yet.</p>;
  }

  return (
    <ul className="space-y-2">
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
    <li className="flex flex-wrap items-center gap-2 rounded-md border border-slate-100 px-3 py-2 text-sm">
      <span className="font-medium text-slate-900">{invite.email}</span>
      <span className="text-slate-500">{invite.role.name}</span>
      <span className={`badge ${STATUS_BADGE[status]}`}>{status}</span>
      {status === "valid" && (
        <button
          type="button"
          onClick={handleRevoke}
          disabled={isPending}
          className="btn-danger ml-auto !px-2.5 !py-1 !text-xs"
        >
          {isPending ? "Revoking..." : "Revoke"}
        </button>
      )}
      {error && (
        <span role="alert" className="form-error w-full">
          {error}
        </span>
      )}
    </li>
  );
}
