"use client";

import { useState, useTransition } from "react";
import { handoffLead } from "@/app/leads/actions";

const ROUND_ROBIN = "__round_robin__";

export function HandoffForm({ leadId, closers }: { leadId: string; closers: { id: string; name: string }[] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(value: string) {
    setError(null);
    const formData = new FormData();
    formData.set("leadId", leadId);
    formData.set("closerId", value === ROUND_ROBIN ? "" : value);
    startTransition(async () => {
      const result = await handoffLead(formData);
      if ("error" in result) setError(result.error);
    });
  }

  return (
    <p>
      <select defaultValue={ROUND_ROBIN} disabled={pending} onChange={(e) => submit(e.target.value)}>
        <option value={ROUND_ROBIN}>Hand off (round robin)</option>
        {closers.map((c) => (
          <option key={c.id} value={c.id}>
            Hand off to {c.name}
          </option>
        ))}
      </select>
      {error && <span role="alert"> {error}</span>}
    </p>
  );
}
