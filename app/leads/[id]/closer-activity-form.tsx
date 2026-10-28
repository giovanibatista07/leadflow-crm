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
    <form onSubmit={handleSubmit}>
      <select value={type} onChange={(e) => setType(e.target.value)}>
        {CADENCE_ACTION_TYPES.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
      <select value={outcome} onChange={(e) => setOutcome(e.target.value as CloserActivityOutcome)}>
        {CLOSER_ACTIVITY_OUTCOMES.map((o) => (
          <option key={o} value={o}>
            {OUTCOME_LABELS[o]}
          </option>
        ))}
      </select>
      <textarea
        placeholder="Notes (optional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      <button type="submit" disabled={pending}>
        {pending ? "Logging..." : "Log update"}
      </button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
