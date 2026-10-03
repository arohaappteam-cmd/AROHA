"use server";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/server/auth/supabase";

// Signing in, signing up and password changes happen in the browser
// (lib/supabase-browser.ts); only signing out runs here, where it can clear
// the session cookies before the redirect.

export async function signOutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
