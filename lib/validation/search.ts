import { z } from "zod";

export const LEAD_STATUSES = [
  "NEW",
  "IN_SEQUENCE",
  "QUALIFIED",
  "WITH_CLOSER",
  "WON",
  "LOST",
  "UNRESPONSIVE",
  "DO_NOT_CONTACT",
] as const;

// SPEC.md "Search and filters": search by name/email/phone/sport/position,
// filter by status/step/advisor/closer/source/due date. Every field is
// optional and comes straight from URL search params, so each is a plain
// string here -- blank means "no filter".
export const leadFiltersSchema = z.object({
  q: z.string().trim().max(200).optional(),
  status: z.enum(LEAD_STATUSES).optional(),
  step: z.coerce.number().int().min(1).optional(),
  advisorId: z.string().uuid().optional(),
  closerId: z.string().uuid().optional(),
  source: z.string().trim().max(200).optional(),
  dueBefore: z.string().optional(),
  dueAfter: z.string().optional(),
});

export type LeadFilters = z.infer<typeof leadFiltersSchema>;

/**
 * Parses raw URL search params (values may be "", which means "unset").
 * Each field is validated independently, so one bad value (a hand-edited
 * URL, a saved view pointing at a since-deleted advisor) is dropped rather
 * than discarding every other filter along with it.
 */
export function parseLeadFilters(raw: Record<string, string | undefined>): LeadFilters {
  const result: LeadFilters = {};
  for (const key of Object.keys(leadFiltersSchema.shape) as (keyof LeadFilters)[]) {
    const value = raw[key];
    if (value === undefined || value === "") continue;
    const fieldResult = leadFiltersSchema.shape[key].safeParse(value);
    if (fieldResult.success) {
      (result as Record<string, unknown>)[key] = fieldResult.data;
    }
  }
  return result;
}

export const saveViewSchema = z.object({
  name: z.string().trim().min(1, "Enter a name for this view").max(200),
});
