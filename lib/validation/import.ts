import { z } from "zod";

// Mirrors the DB CHECK constraint on leads: name plus at least one of
// email or phone (SPEC.md section 9).
export const leadImportRowSchema = z
  .object({
    firstName: z.string().trim().min(1, "First name is required"),
    lastName: z.string().trim().min(1, "Last name is required"),
    email: z.string().trim().email("Invalid email").or(z.literal("")),
    phone: z.string().trim().max(50),
    sport: z.string().trim().max(200),
    position: z.string().trim().max(200),
    location: z.string().trim().max(200),
    notes: z.string().trim().max(5000),
  })
  .refine((row) => row.email.length > 0 || row.phone.length > 0, {
    message: "Row needs at least one of email or phone",
  });

export type LeadImportRow = z.infer<typeof leadImportRowSchema>;

export const importFormSchema = z.object({
  source: z.string().trim().min(1, "Enter a source").max(100),
});
