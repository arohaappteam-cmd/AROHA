import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getEnv } from "@/config/env";

/** True when this server can remove sign-ins (the secret key is configured). */
export function canDeleteSignIns(): boolean {
  const env = getEnv();
  return Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SECRET_KEY);
}

/**
 * Removes a sign-in from Supabase Auth. The secret key bypasses every
 * safeguard, so this client is built per call, never kept, never exported,
 * and used for nothing else.
 */
export async function deleteSignIn(authId: string): Promise<void> {
  const env = getEnv();
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SECRET_KEY) throw new Error("SUPABASE_SECRET_KEY is not configured");
  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await admin.auth.admin.deleteUser(authId);
  // Already gone counts as done: deletion is safe to retry.
  if (error && error.status !== 404) throw error;
}
