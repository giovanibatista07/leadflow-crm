import { z } from "zod";
import { CADENCE_ACTION_TYPES } from "@/lib/validation/cadence";

// SPEC.md section 5 "Outcome rules" -- the four outcomes an advisor/closer
// logs after an attempt. "Sequence finished with no response" isn't here:
// that's detected automatically by the cadence scheduler, never logged.
export const ACTIVITY_OUTCOMES = [
  "NO_ANSWER",
  "QUALIFIED",
  "NOT_INTERESTED",
  "CALL_BACK_LATER",
] as const;

export type ActivityOutcome = (typeof ACTIVITY_OUTCOMES)[number];

export const logActivitySchema = z
  .object({
    leadId: z.string().uuid(),
    type: z.enum(CADENCE_ACTION_TYPES),
    outcome: z.enum(ACTIVITY_OUTCOMES),
    notes: z.preprocess(
      (v) => (v === "" || v == null ? undefined : v),
      z.string().trim().max(5000).optional(),
    ),
    // ISO datetime string, already converted to UTC client-side from the
    // viewer's local "call back" time before it ever reaches the server.
    scheduledAt: z.preprocess(
      (v) => (v === "" || v == null ? undefined : v),
      z.coerce.date().optional(),
    ),
  })
  .superRefine((data, ctx) => {
    if (data.outcome === "NOT_INTERESTED" && !data.notes) {
      ctx.addIssue({
        code: "custom",
        message: "A reason is required when marking a lead Lost",
        path: ["notes"],
      });
    }
    if (data.outcome === "CALL_BACK_LATER" && !data.scheduledAt) {
      ctx.addIssue({
        code: "custom",
        message: "Choose a date and time to call back",
        path: ["scheduledAt"],
      });
    }
  });

export type LogActivityInput = z.infer<typeof logActivitySchema>;
