"use client";

import { useState } from "react";
import { createCadence } from "./actions";

export function CadenceForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const result = await createCadence(formData);
    setPending(false);
    if ("error" in result) setError(result.error);
  }

  return (
    <form action={handleSubmit}>
      <label>
        Cadence name
        <input name="name" type="text" required />
      </label>
      <label>
        <input name="isDefault" type="checkbox" />
        Make this the default cadence
      </label>
      <button type="submit" disabled={pending}>
        {pending ? "Creating..." : "Create cadence"}
      </button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
