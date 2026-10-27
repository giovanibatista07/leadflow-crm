import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
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
    <main>
      <p>
        <Link href="/dashboard">Back to dashboard</Link>
      </p>
      <h1>Cadences</h1>

      {cadences.map((cadence) => (
        <section key={cadence.id}>
          <h2>
            {cadence.name} {cadence.isDefault ? "(default)" : ""}
          </h2>
          {!cadence.isDefault && <SetDefaultButton cadenceId={cadence.id} />}

          <ol>
            {cadence.steps.map((step) => (
              <li key={step.id}>
                {step.actionType} — {step.assignedRole.name} —{" "}
                {step.waitDays != null ? `wait ${step.waitDays}d` : "end of sequence"}
                {step.defaultTime ? ` @ ${step.defaultTime}` : ""}
                {step.templateText ? ` — "${step.templateText}"` : ""}{" "}
                <DeleteStepButton stepId={step.id} />
              </li>
            ))}
          </ol>

          <h3>Add a step</h3>
          <StepForm
            cadenceId={cadence.id}
            nextOrder={(cadence.steps.at(-1)?.order ?? 0) + 1}
            roles={roles}
          />
        </section>
      ))}

      <h2>New cadence</h2>
      <CadenceForm />
    </main>
  );
}
