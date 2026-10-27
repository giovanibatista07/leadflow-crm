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
    <>
      <button type="button" onClick={handleClick} disabled={pending}>
        Delete
      </button>
      {error && <span role="alert"> {error}</span>}
    </>
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
    <>
      <button type="button" onClick={handleClick} disabled={pending}>
        Make default
      </button>
      {error && <span role="alert"> {error}</span>}
    </>
  );
}
