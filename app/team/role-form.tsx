"use client";

import { useState } from "react";
import { ALL_CAPABILITIES } from "@/lib/auth/default-roles";
import { createCustomRole } from "./actions";

export function RoleForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);

    const result = await createCustomRole(formData);
    setPending(false);

    if (result && "error" in result) {
      setError(result.error);
    }
  }

  return (
    <form action={handleSubmit}>
      <label>
        Role name
        <input name="name" type="text" required />
      </label>
      <fieldset>
        <legend>Permissions</legend>
        {ALL_CAPABILITIES.map((capability) => (
          <label key={capability} style={{ display: "block" }}>
            <input type="checkbox" name="permissions" value={capability} />
            {capability}
          </label>
        ))}
      </fieldset>
      <button type="submit" disabled={pending}>
        {pending ? "Creating..." : "Create role"}
      </button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
