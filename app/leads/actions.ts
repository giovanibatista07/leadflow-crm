"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission, requirePermission } from "@/lib/auth/permissions";
import { handoffLeadToCloser, reassignLeadAdvisor } from "@/lib/assignment/service";
import { handoffLeadSchema, reassignLeadSchema } from "@/lib/validation/assignment";
import { leadFiltersSchema, saveViewSchema, type LeadFilters } from "@/lib/validation/search";

export type ActionResult = { error: string } | { success: true };

export async function reassignLead(formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not signed in" };
  try {
    requirePermission(user, "reassign_leads");
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Not allowed" };
  }

  const parsed = reassignLeadSchema.safeParse({
    leadId: formData.get("leadId"),
    advisorId: formData.get("advisorId"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const result = await reassignLeadAdvisor(user.companyId, parsed.data.leadId, parsed.data.advisorId);
  if ("error" in result) return result;

  await prisma.auditLog.create({
    data: {
      companyId: user.companyId,
      userId: user.id,
      action: "lead_reassigned",
      targetType: "lead",
      targetId: parsed.data.leadId,
    },
  });

  revalidatePath("/leads");
  revalidatePath(`/leads/${parsed.data.leadId}`);
  return { success: true };
}

export async function handoffLead(formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not signed in" };

  // An advisor hands off their own leads; a manager (or owner) can do it for anyone.
  const allowed = hasPermission(user, "handoff_to_closer") || hasPermission(user, "reassign_leads");
  if (!user.active || !allowed) {
    return { error: "Not allowed" };
  }

  const parsed = handoffLeadSchema.safeParse({
    leadId: formData.get("leadId"),
    closerId: formData.get("closerId"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  if (!hasPermission(user, "reassign_leads")) {
    const lead = await prisma.lead.findFirst({
      where: { id: parsed.data.leadId, companyId: user.companyId },
      select: { assignedAdvisorId: true },
    });
    if (!lead || lead.assignedAdvisorId !== user.id) {
      return { error: "You can only hand off your own leads" };
    }
  }

  const result = await handoffLeadToCloser(
    user.companyId,
    parsed.data.leadId,
    parsed.data.closerId || undefined,
  );
  if ("error" in result) return result;

  await prisma.auditLog.create({
    data: {
      companyId: user.companyId,
      userId: user.id,
      action: "lead_handoff",
      targetType: "lead",
      targetId: parsed.data.leadId,
    },
  });

  revalidatePath("/leads");
  revalidatePath(`/leads/${parsed.data.leadId}`);
  revalidatePath("/closer");
  return { success: true };
}

/** SPEC.md: "Saved views per user (for example 'My overdue leads' or 'Qualified this week')." */
export async function saveView(formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not signed in" };

  const parsedName = saveViewSchema.safeParse({ name: formData.get("name") });
  if (!parsedName.success) {
    return { error: parsedName.error.issues[0]?.message ?? "Invalid input" };
  }

  const filters: LeadFilters = {};
  for (const key of Object.keys(leadFiltersSchema.shape) as (keyof LeadFilters)[]) {
    const value = formData.get(key);
    if (typeof value !== "string" || value === "") continue;
    const fieldResult = leadFiltersSchema.shape[key].safeParse(value);
    if (fieldResult.success) {
      (filters as Record<string, unknown>)[key] = fieldResult.data;
    }
  }

  await prisma.savedView.upsert({
    where: { userId_name: { userId: user.id, name: parsedName.data.name } },
    create: { companyId: user.companyId, userId: user.id, name: parsedName.data.name, filters },
    update: { filters },
  });

  revalidatePath("/leads");
  return { success: true };
}

export async function deleteView(formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not signed in" };

  const viewId = formData.get("viewId");
  if (typeof viewId !== "string") return { error: "Invalid input" };

  await prisma.savedView.deleteMany({ where: { id: viewId, userId: user.id } });

  revalidatePath("/leads");
  return { success: true };
}
