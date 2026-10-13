"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

/** Minimal shape we read from the submitted login/signup form. */
function readCredentials(formData: FormData): {
  email: string;
  password: string;
} {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  return { email, password };
}

function loginRedirect(message: string): never {
  // Surface errors/notices back on the /login page via a query param.
  redirect(`/login?message=${encodeURIComponent(message)}`);
}

export async function signIn(formData: FormData): Promise<void> {
  const { email, password } = readCredentials(formData);

  if (!email || !password) {
    loginRedirect("Email and password are required.");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    loginRedirect(error.message);
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signUp(formData: FormData): Promise<void> {
  const { email, password } = readCredentials(formData);

  if (!email || !password) {
    loginRedirect("Email and password are required.");
  }

  if (password.length < 8) {
    loginRedirect("Password must be at least 8 characters.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    loginRedirect(error.message);
  }

  // When email confirmation is enabled, no session is returned yet.
  if (!data.session) {
    loginRedirect(
      "Account created. Check your email to confirm, then sign in.",
    );
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
