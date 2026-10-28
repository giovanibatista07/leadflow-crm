"use client";

import { useState, useTransition } from "react";
import { logCloserActivity } from "./actions";

export function CloserQuickActions({ leadId }: { leadId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function markAs(outcome: "WON" | "LOST") {
    setError(null);
    const formData = new FormData();
    formData.set("leadId", leadId);
    formData.set("type", "CUSTOM");
    formData.set("outcome", outcome);
    startTransition(async () => {
      const result = await logCloserActivity(formData);
      if ("error" in result) setError(result.error);
    });
  }

  return (
    <>
      {" "}
      <button type="button" disabled={pending} onClick={() => markAs("WON")}>
        Mark Won
      </button>{" "}
      <button type="button" disabled={pending} onClick={() => markAs("LOST")}>
        Mark Lost
      </button>
      {error && <span role="alert"> {error}</span>}
    </>
  );
}
