import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { ImportForm } from "./import-form";

export default async function ImportPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (!hasPermission(user, "import_leads")) {
    redirect("/dashboard");
  }

  return (
    <main>
      <p>
        <Link href="/dashboard">Back to dashboard</Link>
      </p>
      <h1>Import leads</h1>
      <ImportForm />
    </main>
  );
}
