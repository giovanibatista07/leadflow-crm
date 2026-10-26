"use client";

import { useState } from "react";
import { createInvite } from "./actions";

export function InviteForm({
  roles,
  companyEmailDomain,
}: {
  roles: { id: string; name: string }[];
  companyEmailDomain: string;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    setMessage(null);

    const result = await createInvite(formData);
    setPending(false);

    if (result && "error" in result) {
      setError(result.error);
    } else if (result && "success" in result && result.message) {
      setMessage(result.message);
    }
  }

  return (
    <form action={handleSubmit}>
      <label>
        Email ({companyEmailDomain})
        <input name="email" type="email" required />
      </label>
      <label>
        Role
        <select name="roleId" required>
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" disabled={pending}>
        {pending ? "Sending..." : "Send invite"}
      </button>
      {error && <p role="alert">{error}</p>}
      {message && <p>{message}</p>}
    </form>
  );
}
