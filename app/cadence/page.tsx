import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { AppShell } from "@/components/app-shell";
import { CadenceForm } from "./cadence-form";
import { StepForm } from "./step-form";
import { DeleteStepButton, SetDefaultButton } from "./cadence-buttons";

export default async function CadencePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (!hasPermission(user, "manage_cadence")) {
    redirect("/dashboard");
  }

  const [cadences, roles] = await Promise.all([
    prisma.cadence.findMany({
      where: { companyId: user.companyId },
      include: { steps: { orderBy: { order: "asc" }, include: { assignedRole: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.role.findMany({ where: { companyId: user.companyId }, orderBy: { name: "asc" } }),
  ]);

  return (
    <AppShell user={user}>
      <main>
        <h1>Cadences</h1>

        <div className="mt-6 space-y-6">
          {cadences.map((cadence) => (
            <section key={cadence.id} className="card">
              <div className="flex flex-wrap items-center gap-2">
                <h2>{cadence.name}</h2>
                {cadence.isDefault ? (
                  <span className="badge badge-brand">Default</span>
                ) : (
                  <SetDefaultButton cadenceId={cadence.id} />
                )}
              </div>

              <ol className="mt-3 space-y-2">
                {cadence.steps.map((step) => (
                  <li
                    key={step.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-sm"
                  >
                    <span>
                      <span className="badge badge-brand mr-2">{step.actionType}</span>
                      {step.assignedRole.name} —{" "}
                      {step.waitDays != null ? `wait ${step.waitDays}d` : "end of sequence"}
                      {step.defaultTime ? ` @ ${step.defaultTime}` : ""}
                      {step.templateText ? ` — "${step.templateText}"` : ""}
                    </span>
                    <DeleteStepButton stepId={step.id} />
                  </li>
                ))}
              </ol>

              <div className="mt-4 border-t border-slate-100 pt-4">
                <h3>Add a step</h3>
                <div className="mt-2">
                  <StepForm
                    cadenceId={cadence.id}
                    nextOrder={(cadence.steps.at(-1)?.order ?? 0) + 1}
                    roles={roles}
                  />
                </div>
              </div>
            </section>
          ))}
        </div>

        <div className="card mt-6">
          <h2>New cadence</h2>
          <div className="mt-2">
            <CadenceForm />
          </div>
        </div>
      </main>
    </AppShell>
  );
}
