"use client";

import { useState } from "react";
import { setManagerDelegation } from "./actions";

export function DelegationForm({ initiallyEnabled }: { initiallyEnabled: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);

    const result = await setManagerDelegation(formData);
    setPending(false);

    if (result && "error" in result) {
      setError(result.error);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <label className="mb-0 flex items-center gap-2 font-normal text-slate-700">
        <input type="checkbox" name="enabled" defaultChecked={initiallyEnabled} />
        Let managers create roles and invite people
      </label>
      <button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save"}
      </button>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
    </form>
  );
}
