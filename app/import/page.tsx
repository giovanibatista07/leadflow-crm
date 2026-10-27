import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { ImportForm } from "./import-form";
import { SheetImportForm } from "./sheet-import-form";

export default async function ImportPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (!hasPermission(user, "import_leads")) {
    redirect("/dashboard");
  }

  const googleConnection = await prisma.googleConnection.findUnique({
    where: { userId: user.id },
  });

  return (
    <main>
      <p>
        <Link href="/dashboard">Back to dashboard</Link>
      </p>
      <h1>Import leads</h1>
      <ImportForm />

      <hr />

      {googleConnection ? (
        <SheetImportForm />
      ) : (
        <p>
          <a href="/api/google/connect">Connect Google to import from Sheets</a>
        </p>
      )}
    </main>
  );
}
