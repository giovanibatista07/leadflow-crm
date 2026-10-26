"use client";

import { useState } from "react";
import { acceptInvite } from "./actions";

export function AcceptInviteForm({ token, email }: { token: string; email: string }) {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);

    const result = await acceptInvite(formData);
    setPending(false);

    if (result && "error" in result) {
      setError(result.error);
    }
  }

  return (
    <form action={handleSubmit}>
      <input type="hidden" name="token" value={token} />
      <p>Email: {email}</p>
      <label>
        Your name
        <input
          name="name"
          type="text"
          required
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <label>
        Choose a password
        <input
          name="password"
          type="password"
          required
          autoComplete="new-password"
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      <button type="submit" disabled={pending}>
        {pending ? "Joining..." : "Join"}
      </button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
