"use client";

import { useState } from "react";
import { ACTIVITY_OUTCOMES, type ActivityOutcome } from "@/lib/validation/activity";
import { logActivity } from "./actions";

const OUTCOME_LABELS: Record<ActivityOutcome, string> = {
  NO_ANSWER: "No answer",
  QUALIFIED: "Connected, interested (Qualified)",
  NOT_INTERESTED: "Connected, not interested (Lost)",
  CALL_BACK_LATER: "Call back later",
};

export function ActivityForm({ leadId, type }: { leadId: string; type: string }) {
  const [outcome, setOutcome] = useState<ActivityOutcome>("NO_ANSWER");
  const [notes, setNotes] = useState("");
  const [callBackAt, setCallBackAt] = useState("");
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
    // Converted from the browser's local wall-clock time to a real instant
    // (UTC under the hood) before it ever leaves the client.
    if (outcome === "CALL_BACK_LATER" && callBackAt) {
      formData.set("scheduledAt", new Date(callBackAt).toISOString());
    }

    const result = await logActivity(formData);
    setPending(false);
    if ("error" in result) setError(result.error);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={outcome}
          onChange={(e) => setOutcome(e.target.value as ActivityOutcome)}
          className="w-auto"
        >
          {ACTIVITY_OUTCOMES.map((o) => (
            <option key={o} value={o}>
              {OUTCOME_LABELS[o]}
            </option>
          ))}
        </select>
        {outcome === "CALL_BACK_LATER" && (
          <input
            type="datetime-local"
            value={callBackAt}
            onChange={(e) => setCallBackAt(e.target.value)}
            required
            className="w-auto"
          />
        )}
      </div>
      <textarea
        placeholder={outcome === "NOT_INTERESTED" ? "Reason (required)" : "Notes (optional)"}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
      />
      <button type="submit" disabled={pending}>
        {pending ? "Logging..." : "Log activity"}
      </button>
      {error && <p className="form-error" role="alert">{error}</p>}
    </form>
  );
}
