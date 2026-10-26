"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logInSchema } from "@/lib/validation/auth";

export type LogInResult = { error: string } | undefined;

export async function logIn(formData: FormData): Promise<LogInResult> {
  const parsed = logInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}

export async function logOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
