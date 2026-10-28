"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logInSchema } from "@/lib/validation/auth";
import { clearFailedLogins, isLoginRateLimited, recordFailedLogin } from "@/lib/auth/rate-limit";

export type LogInResult = { error: string } | undefined;

export async function logIn(formData: FormData): Promise<LogInResult> {
  const parsed = logInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { email, password } = parsed.data;

  if (await isLoginRateLimited(email)) {
    // Still recorded (without calling Supabase) so continued hammering
    // past the block is what actually reaches the repeated-failures alert
    // threshold -- otherwise the count would freeze the moment blocking
    // kicks in and that alert could never fire.
    await recordFailedLogin(email);
    return { error: "Too many failed attempts. Try again in a few minutes." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    await recordFailedLogin(email);
    return { error: error.message };
  }

  await clearFailedLogins(email);
  redirect("/dashboard");
}

export async function logOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
