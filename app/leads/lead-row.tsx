"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { handoffLead, reassignLead } from "./actions";
import { statusBadgeClass } from "@/lib/leads/status-badge";

type Person = { id: string; name: string };

type LeadSummary = {
  id: string;
  name: string;
  status: string;
  source: string;
  assignedAdvisorId: string | null;
  advisorName: string | null;
  closerName: string | null;
};

const HANDOFF_ELIGIBLE_STATUSES = new Set(["NEW", "IN_SEQUENCE", "QUALIFIED"]);
const ROUND_ROBIN = "__round_robin__";

export function LeadRow({
  lead,
  advisors,
  closers,
  canReassign,
  canHandoff,
}: {
  lead: LeadSummary;
  advisors: Person[];
  closers: Person[];
  canReassign: boolean;
  canHandoff: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submitReassign(advisorId: string) {
    if (!advisorId) return;
    setError(null);
    const formData = new FormData();
    formData.set("leadId", lead.id);
    formData.set("advisorId", advisorId);
    startTransition(async () => {
      const result = await reassignLead(formData);
      if ("error" in result) setError(result.error);
    });
  }

  function submitHandoff(value: string) {
    setError(null);
    const formData = new FormData();
    formData.set("leadId", lead.id);
    formData.set("closerId", value === ROUND_ROBIN ? "" : value);
    startTransition(async () => {
      const result = await handoffLead(formData);
      if ("error" in result) setError(result.error);
    });
  }

  const showHandoff = canHandoff && HANDOFF_ELIGIBLE_STATUSES.has(lead.status);

  return (
    <tr>
      <td>
        <Link href={`/leads/${lead.id}`}>{lead.name}</Link>
      </td>
      <td>
        <span className={`badge ${statusBadgeClass(lead.status)}`}>{lead.status}</span>
      </td>
      <td>{lead.source}</td>
      <td>{lead.advisorName ?? "Unassigned"}</td>
      <td>{lead.closerName ?? "—"}</td>
      {(canReassign || canHandoff) && (
        <td>
          <div className="flex flex-wrap items-center gap-2">
            {canReassign && (
              <select
                defaultValue=""
                disabled={pending}
                onChange={(e) => submitReassign(e.target.value)}
                className="w-auto"
              >
                <option value="" disabled>
                  Reassign to...
                </option>
                {advisors.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            )}
            {showHandoff && (
              <select
                defaultValue={ROUND_ROBIN}
                disabled={pending}
                onChange={(e) => submitHandoff(e.target.value)}
                className="w-auto"
              >
                <option value={ROUND_ROBIN}>Hand off (round robin)</option>
                {closers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
            {error && (
              <span role="alert" className="text-xs text-red-600">
                {error}
              </span>
            )}
          </div>
        </td>
      )}
    </tr>
  );
}
