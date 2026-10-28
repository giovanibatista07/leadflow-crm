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
    <form action={handleSubmit} className="space-y-4">
      <label>
        Role name
        <input name="name" type="text" required className="mt-1 max-w-xs" />
      </label>
      <fieldset>
        <legend>Permissions</legend>
        <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
          {ALL_CAPABILITIES.map((capability) => (
            <label key={capability} className="mb-0 flex items-center gap-2 font-normal text-slate-700">
              <input type="checkbox" name="permissions" value={capability} />
              {capability}
            </label>
          ))}
        </div>
      </fieldset>
      <button type="submit" disabled={pending}>
        {pending ? "Creating..." : "Create role"}
      </button>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
    </form>
  );
}
