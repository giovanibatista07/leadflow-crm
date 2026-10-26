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
    <form action={handleSubmit}>
      <label>
        <input type="checkbox" name="enabled" defaultChecked={initiallyEnabled} />
        Let managers create roles and invite people
      </label>
      <button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save"}
      </button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
