import "server-only";

import { cache } from "react";

import { LOCAL_USER_DEFAULT_NAME, LOCAL_USER_HANDLE } from "@/config/site";
import { userRepository } from "@/server/repositories/user.repository";

/**
 * Resolves the user for the current request.
 *
 * Phase 0 is single-user: everyone is the local user, created on first
 * access. When real accounts arrive, only this function should need to
 * change — everything downstream already takes a `userId`.
 */
export const getCurrentUser = cache(async () => {
  return userRepository.ensure(LOCAL_USER_HANDLE, LOCAL_USER_DEFAULT_NAME);
});
