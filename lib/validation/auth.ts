import { z } from "zod";

export const signUpSchema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(200),
  companyName: z.string().trim().min(1, "Enter a company name").max(200),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
});

export type SignUpInput = z.infer<typeof signUpSchema>;

export const logInSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});

export type LogInInput = z.infer<typeof logInSchema>;
