"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission, requirePermission } from "@/lib/auth/permissions";
import { applyActivityOutcome } from "@/lib/cadence/service";
import { logActivitySchema } from "@/lib/validation/activity";

export type ActionResult = { error: string } | { success: true };

export async function logActivity(formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not signed in" };
  try {
    requirePermission(user, "log_activity");
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Not allowed" };
  }

  const parsed = logActivitySchema.safeParse({
    leadId: formData.get("leadId"),
    type: formData.get("type"),
    outcome: formData.get("outcome"),
    notes: formData.get("notes") ?? "",
    scheduledAt: formData.get("scheduledAt") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { leadId, type, outcome, notes, scheduledAt } = parsed.data;

  const lead = await prisma.lead.findFirst({ where: { id: leadId, companyId: user.companyId } });
  if (!lead) return { error: "Lead not found" };

  const owns = lead.assignedAdvisorId === user.id || lead.assignedCloserId === user.id;
  if (!owns && !hasPermission(user, "view_all_leads")) {
    return { error: "You can only log activity on your own leads" };
  }

  await prisma.$transaction(
    async (tx) => {
      await tx.activity.create({
        data: {
          companyId: user.companyId,
          leadId,
          userId: user.id,
          type,
          outcome,
          notes: notes ?? null,
          scheduledAt: outcome === "CALL_BACK_LATER" ? scheduledAt : null,
          completedAt: new Date(),
        },
      });
      await applyActivityOutcome(tx, user.companyId, leadId, outcome, scheduledAt);
    },
    { timeout: 20000 },
  );

  revalidatePath("/today");
  revalidatePath(`/leads/${leadId}`);
  return { success: true };
}
