"use client";

import { useState } from "react";
import Link from "next/link";
import { logIn } from "./actions";

export default function LogInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);

    const result = await logIn(formData);
    setPending(false);

    if (result && "error" in result) {
      setError(result.error);
    }
  }

  return (
    <main className="flex min-h-[80vh] items-center justify-center">
      <div className="card w-full max-w-sm">
        <h1>Log in</h1>
        <form action={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          <button type="submit" disabled={pending} className="w-full">
            {pending ? "Logging in..." : "Log in"}
          </button>
        </form>
        <p className="mt-4 text-center">
          Need an account? <Link href="/signup">Create one</Link>
        </p>
      </div>
    </main>
  );
}
