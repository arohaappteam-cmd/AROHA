import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { getEnv } from "@/config/env";
import { LOCAL_USER_DEFAULT_NAME, LOCAL_USER_HANDLE } from "@/config/site";
import { userRepository } from "@/server/repositories/user.repository";

import { getAuthIdentity } from "./supabase";

/** True when people sign in with real accounts (Supabase Auth). */
export function isAuthEnabled(): boolean {
  return getEnv().AUTH_MODE === "supabase";
}

/**
 * Resolves the user for the current request. Everything downstream takes a
 * `userId`, so this is the one place that knows how people sign in.
 *
 * With Supabase Auth on, a signed-out request is sent to /login (the proxy
 * usually gets there first). In local mode, everyone is the single local
 * user, created on first access.
 */
export const getCurrentUser = cache(async () => {
  if (!isAuthEnabled()) {
    return userRepository.ensure(LOCAL_USER_HANDLE, LOCAL_USER_DEFAULT_NAME);
  }

  const identity = await getAuthIdentity();
  if (!identity) redirect("/login");
  return userRepository.ensureForAuth(identity);
});
