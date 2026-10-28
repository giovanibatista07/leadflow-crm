"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission, requirePermission } from "@/lib/auth/permissions";
import { logCloserActivitySchema } from "@/lib/validation/activity";

export type ActionResult = { error: string } | { success: true };

/** SPEC.md's "Closer view": the closer logs each update (call made, meeting attended, no-show, offer sent, Won or Lost). */
export async function logCloserActivity(formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not signed in" };
  try {
    requirePermission(user, "set_won_lost");
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Not allowed" };
  }

  const parsed = logCloserActivitySchema.safeParse({
    leadId: formData.get("leadId"),
    type: formData.get("type"),
    outcome: formData.get("outcome"),
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { leadId, type, outcome, notes } = parsed.data;

  const lead = await prisma.lead.findFirst({ where: { id: leadId, companyId: user.companyId } });
  if (!lead) return { error: "Lead not found" };

  const owns = lead.assignedCloserId === user.id;
  if (!owns && !hasPermission(user, "view_all_leads")) {
    return { error: "You can only log activity on leads handed to you" };
  }
  if (lead.status === "WON" || lead.status === "LOST") {
    return { error: "This lead is already closed" };
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
          completedAt: new Date(),
        },
      });

      if (outcome === "WON" || outcome === "LOST") {
        await tx.lead.update({ where: { id: leadId }, data: { status: outcome } });
      }
    },
    { timeout: 20000 },
  );

  revalidatePath("/closer");
  revalidatePath(`/leads/${leadId}`);
  return { success: true };
}
