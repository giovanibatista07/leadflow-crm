"use client";

import { useState, useTransition } from "react";
import { deleteCadenceStep, setDefaultCadence } from "./actions";

export function DeleteStepButton({ stepId }: { stepId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    const formData = new FormData();
    formData.set("stepId", stepId);
    startTransition(async () => {
      const result = await deleteCadenceStep(formData);
      if ("error" in result) setError(result.error);
    });
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="rounded-md border border-red-200 bg-white px-2 py-1 text-xs font-medium text-red-600 shadow-sm hover:bg-red-50"
      >
        Delete
      </button>
      {error && (
        <span className="text-xs text-red-600" role="alert">
          {error}
        </span>
      )}
    </span>
  );
}

export function SetDefaultButton({ cadenceId }: { cadenceId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    const formData = new FormData();
    formData.set("cadenceId", cadenceId);
    startTransition(async () => {
      const result = await setDefaultCadence(formData);
      if ("error" in result) setError(result.error);
    });
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
      >
        Make default
      </button>
      {error && (
        <span className="text-xs text-red-600" role="alert">
          {error}
        </span>
      )}
    </span>
  );
}
