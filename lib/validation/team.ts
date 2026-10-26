import { z } from "zod";
import { ALL_CAPABILITIES } from "@/lib/auth/default-roles";

export const createInviteSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  roleId: z.string().uuid("Choose a role"),
});

export type CreateInviteInput = z.infer<typeof createInviteSchema>;

export const acceptInviteSchema = z.object({
  token: z.string().min(1),
  name: z.string().trim().min(1, "Enter your name").max(200),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
});

export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;

export const createRoleSchema = z.object({
  name: z.string().trim().min(1, "Enter a role name").max(100),
  permissions: z.array(z.enum(ALL_CAPABILITIES)).min(1, "Pick at least one permission"),
});

export type CreateRoleInput = z.infer<typeof createRoleSchema>;
