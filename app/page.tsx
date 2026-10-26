import Link from "next/link";

export default function HomePage() {
  return (
    <main>
      <h1>LeadFlow CRM</h1>
      <p>Project scaffold — see SPEC.md for the v1 roadmap.</p>
      <p>
        <Link href="/signup">Create a company account</Link> ·{" "}
        <Link href="/login">Log in</Link>
      </p>
    </main>
  );
}
