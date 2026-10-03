import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getEnv } from "@/config/env";

/**
 * A Supabase client bound to this request's cookies. Server Components can't
 * write cookies, so a refreshed session is persisted by the proxy instead —
 * the failed write here is expected and harmless.
 */
export async function createSupabaseServerClient() {
  const env = getEnv();
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    throw new Error("Supabase Auth is not configured");
  }
  const cookieStore = await cookies();

  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        } catch {
          // Called from a Server Component; the proxy keeps the session fresh.
        }
      },
    },
  });
}

/** The verified identity of the signed-in account, or null when signed out. */
export async function getAuthIdentity() {
  const supabase = await createSupabaseServerClient();
  // getClaims verifies the JWT signature; never trust getSession() on the server.
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return null;

  const claims = data.claims;
  const metadata = (claims.user_metadata ?? {}) as Record<string, unknown>;
  const email = typeof claims.email === "string" && claims.email ? claims.email : null;
  const named = typeof metadata.display_name === "string" ? metadata.display_name.trim() : "";

  return {
    authId: claims.sub,
    email,
    displayName: named || email?.split("@")[0] || "Adventurer",
  };
}
