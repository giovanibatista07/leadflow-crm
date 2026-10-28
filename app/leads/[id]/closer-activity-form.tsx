"use client";

import { useState } from "react";
import { CLOSER_ACTIVITY_OUTCOMES, type CloserActivityOutcome } from "@/lib/validation/activity";
import { CADENCE_ACTION_TYPES } from "@/lib/validation/cadence";
import { logCloserActivity } from "@/app/closer/actions";

const OUTCOME_LABELS: Record<CloserActivityOutcome, string> = {
  CALL_MADE: "Call made",
  MEETING_ATTENDED: "Meeting attended",
  NO_SHOW: "No-show",
  OFFER_SENT: "Offer sent",
  WON: "Won",
  LOST: "Lost",
};

export function CloserActivityForm({ leadId }: { leadId: string }) {
  const [type, setType] = useState<string>("CALL");
  const [outcome, setOutcome] = useState<CloserActivityOutcome>("CALL_MADE");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const formData = new FormData();
    formData.set("leadId", leadId);
    formData.set("type", type);
    formData.set("outcome", outcome);
    formData.set("notes", notes);

    const result = await logCloserActivity(formData);
    setPending(false);
    if ("error" in result) setError(result.error);
    else setNotes("");
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-3">
      <h3>Log closer update</h3>
      <div className="flex flex-wrap gap-2">
        <select value={type} onChange={(e) => setType(e.target.value)} className="w-auto">
          {CADENCE_ACTION_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          value={outcome}
          onChange={(e) => setOutcome(e.target.value as CloserActivityOutcome)}
          className="w-auto"
        >
          {CLOSER_ACTIVITY_OUTCOMES.map((o) => (
            <option key={o} value={o}>
              {OUTCOME_LABELS[o]}
            </option>
          ))}
        </select>
      </div>
      <textarea
        placeholder="Notes (optional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
      />
      <div className="flex items-center gap-2">
        <button type="submit" disabled={pending}>
          {pending ? "Logging..." : "Log update"}
        </button>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      </div>
    </form>
  );
}
