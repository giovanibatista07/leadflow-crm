import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-[80vh] flex-col items-center justify-center text-center">
      <h1 className="text-4xl">LeadFlow CRM</h1>
      <p className="mt-3 max-w-md text-base">
        Import leads, assign them, run your outreach cadence, and hand off to a closer — all in one place.
      </p>
      <div className="mt-6 flex items-center gap-3">
        <Link
          href="/signup"
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700 hover:no-underline"
        >
          Create a company account
        </Link>
        <Link
          href="/login"
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 hover:no-underline"
        >
          Log in
        </Link>
      </div>
    </main>
  );
}
