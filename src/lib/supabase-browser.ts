"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase in the browser, for sign-in, sign-up and password changes. Those
 * calls go out from each visitor's own connection, so Supabase's per-IP
 * brute-force limits apply per person rather than to the whole app.
 *
 * Both values are public by design (they're in every page) and are inlined
 * at build time. The session lands in cookies the server can read.
 */
export function supabaseBrowser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase Auth is not configured");
  return createBrowserClient(url, key);
}
