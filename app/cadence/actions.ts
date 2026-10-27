"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { PermissionError, requirePermission } from "@/lib/auth/permissions";
import {
  createCadenceSchema,
  createCadenceStepSchema,
  deleteStepSchema,
  setDefaultCadenceSchema,
} from "@/lib/validation/cadence";

export type ActionResult = { error: string } | { success: true };

async function requireCadenceManager() {
  const user = await getCurrentUser();
  if (!user) {
    throw new PermissionError("Not signed in");
  }
  requirePermission(user, "manage_cadence");
  return user;
}

export async function createCadence(formData: FormData): Promise<ActionResult> {
  let user;
  try {
    user = await requireCadenceManager();
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Not allowed" };
  }

  const parsed = createCadenceSchema.safeParse({
    name: formData.get("name"),
    isDefault: formData.get("isDefault") === "on",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await prisma.$transaction(async (tx) => {
    if (parsed.data.isDefault) {
      await tx.cadence.updateMany({
        where: { companyId: user.companyId, isDefault: true },
        data: { isDefault: false },
      });
    }
    const cadence = await tx.cadence.create({
      data: { companyId: user.companyId, name: parsed.data.name, isDefault: parsed.data.isDefault },
    });
    await tx.auditLog.create({
      data: {
        companyId: user.companyId,
        userId: user.id,
        action: "cadence_created",
        targetType: "cadence",
        targetId: cadence.id,
      },
    });
  });

  revalidatePath("/cadence");
  return { success: true };
}

export async function setDefaultCadence(formData: FormData): Promise<ActionResult> {
  let user;
  try {
    user = await requireCadenceManager();
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Not allowed" };
  }

  const parsed = setDefaultCadenceSchema.safeParse({ cadenceId: formData.get("cadenceId") });
  if (!parsed.success) {
    return { error: "Invalid input" };
  }

  const cadence = await prisma.cadence.findFirst({
    where: { id: parsed.data.cadenceId, companyId: user.companyId },
  });
  if (!cadence) return { error: "Cadence not found" };

  await prisma.$transaction([
    prisma.cadence.updateMany({
      where: { companyId: user.companyId, isDefault: true },
      data: { isDefault: false },
    }),
    prisma.cadence.update({ where: { id: cadence.id }, data: { isDefault: true } }),
  ]);

  revalidatePath("/cadence");
  return { success: true };
}

export async function addCadenceStep(formData: FormData): Promise<ActionResult> {
  let user;
  try {
    user = await requireCadenceManager();
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Not allowed" };
  }

  const parsed = createCadenceStepSchema.safeParse({
    cadenceId: formData.get("cadenceId"),
    order: formData.get("order"),
    actionType: formData.get("actionType"),
    assignedRoleId: formData.get("assignedRoleId"),
    waitDays: formData.get("waitDays") ?? "",
    defaultTime: formData.get("defaultTime") ?? "",
    templateText: formData.get("templateText") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { cadenceId, assignedRoleId } = parsed.data;

  const [cadence, role] = await Promise.all([
    prisma.cadence.findFirst({ where: { id: cadenceId, companyId: user.companyId } }),
    prisma.role.findFirst({ where: { id: assignedRoleId, companyId: user.companyId } }),
  ]);
  if (!cadence) return { error: "Cadence not found" };
  if (!role) return { error: "Role not found" };

  try {
    await prisma.cadenceStep.create({
      data: {
        cadenceId,
        order: parsed.data.order,
        actionType: parsed.data.actionType,
        assignedRoleId,
        waitDays: parsed.data.waitDays ?? null,
        defaultTime: parsed.data.defaultTime ?? null,
        templateText: parsed.data.templateText ?? null,
      },
    });
  } catch {
    return { error: "Step order must be unique within a cadence" };
  }

  revalidatePath("/cadence");
  return { success: true };
}

export async function deleteCadenceStep(formData: FormData): Promise<ActionResult> {
  let user;
  try {
    user = await requireCadenceManager();
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Not allowed" };
  }

  const parsed = deleteStepSchema.safeParse({ stepId: formData.get("stepId") });
  if (!parsed.success) {
    return { error: "Invalid input" };
  }

  const step = await prisma.cadenceStep.findFirst({
    where: { id: parsed.data.stepId, cadence: { companyId: user.companyId } },
  });
  if (!step) return { error: "Step not found" };

  await prisma.cadenceStep.delete({ where: { id: step.id } });

  revalidatePath("/cadence");
  return { success: true };
}
