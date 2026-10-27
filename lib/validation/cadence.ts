import { z } from "zod";

export const CADENCE_ACTION_TYPES = ["EMAIL", "CALL", "MESSAGE", "MEETING", "CUSTOM"] as const;

export const createCadenceSchema = z.object({
  name: z.string().trim().min(1, "Enter a cadence name").max(200),
  isDefault: z.boolean(),
});

export type CreateCadenceInput = z.infer<typeof createCadenceSchema>;

// waitDays omitted/empty means "none (end of sequence)" (SPEC.md's final step example).
export const createCadenceStepSchema = z.object({
  cadenceId: z.string().uuid(),
  order: z.coerce.number().int().min(1, "Step order must be 1 or higher"),
  actionType: z.enum(CADENCE_ACTION_TYPES),
  assignedRoleId: z.string().uuid("Choose a role"),
  waitDays: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.coerce.number().int().min(0).optional(),
  ),
  defaultTime: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z
      .string()
      .trim()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM (24-hour)")
      .optional(),
  ),
  templateText: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.string().trim().max(5000).optional(),
  ),
});

export type CreateCadenceStepInput = z.infer<typeof createCadenceStepSchema>;

export const deleteStepSchema = z.object({
  stepId: z.string().uuid(),
});

export const setDefaultCadenceSchema = z.object({
  cadenceId: z.string().uuid(),
});
