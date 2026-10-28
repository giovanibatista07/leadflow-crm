import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { AppShell } from "@/components/app-shell";
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
    <AppShell user={user}>
      <main>
        <h1>Import leads</h1>
        <div className="mt-4">
          <ImportForm />
        </div>

        <div className="mt-6">
          {googleConnection ? (
            <SheetImportForm />
          ) : (
            <p className="card">
              <a href="/api/google/connect">Connect Google to import from Sheets</a>
            </p>
          )}
        </div>
      </main>
    </AppShell>
  );
}
