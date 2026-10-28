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
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => markAs("WON")}
        className="rounded-md border border-green-200 bg-white px-2 py-1 text-xs font-medium text-green-700 shadow-sm hover:bg-green-50"
      >
        Mark Won
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => markAs("LOST")}
        className="rounded-md border border-red-200 bg-white px-2 py-1 text-xs font-medium text-red-600 shadow-sm hover:bg-red-50"
      >
        Mark Lost
      </button>
      {error && (
        <span className="text-xs text-red-600" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
