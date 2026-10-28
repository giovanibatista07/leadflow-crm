"use client";

import { useState } from "react";
import Link from "next/link";
import { signUpOwner } from "./actions";

export default function SignUpPage() {
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    setMessage(null);

    const result = await signUpOwner(formData);
    setPending(false);

    if (result && "error" in result) {
      setError(result.error);
    } else if (result && "success" in result) {
      setMessage(result.message);
    }
  }

  return (
    <main className="flex min-h-[80vh] items-center justify-center">
      <div className="card w-full max-w-sm">
        <h1>Create your company account</h1>
        <form action={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="name">Your name</label>
            <input
              id="name"
              name="name"
              type="text"
              required
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="companyName">Company name</label>
            <input
              id="companyName"
              name="companyName"
              type="text"
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </div>
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
              autoComplete="new-password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          {message && <p className="form-success">{message}</p>}
          <button type="submit" disabled={pending} className="w-full">
            {pending ? "Creating account..." : "Create account"}
          </button>
        </form>
        <p className="mt-4 text-center">
          Already have an account? <Link href="/login">Log in</Link>
        </p>
      </div>
    </main>
  );
}
