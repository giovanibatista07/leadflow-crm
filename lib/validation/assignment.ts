import { z } from "zod";

export const reassignLeadSchema = z.object({
  leadId: z.string().uuid(),
  advisorId: z.string().uuid(),
});

export const handoffLeadSchema = z.object({
  leadId: z.string().uuid(),
  // Omitted/empty means "round robin across active closers".
  closerId: z.string().uuid().optional().or(z.literal("")),
});
