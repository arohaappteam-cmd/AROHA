import "server-only";

import { db } from "@/server/db";

export const userRepository = {
  findByHandle(handle: string) {
    return db.user.findUnique({ where: { handle } });
  },

  /** Creates the user on first access; never overwrites an existing profile. */
  ensure(handle: string, displayName: string) {
    return db.user.upsert({
      where: { handle },
      update: {},
      create: { handle, displayName },
    });
  },
};
