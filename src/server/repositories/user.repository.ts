import "server-only";

import { randomBytes } from "node:crypto";

import { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";

export type AuthIdentity = { authId: string; email: string | null; displayName: string };

/** A readable, URL-safe handle: "Priya Sharma" → "priya-sharma-4k2q". */
function generateHandle(displayName: string): string {
  const base =
    displayName
      .normalize("NFKD")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 24) || "member";
  return `${base}-${randomBytes(3).toString("hex").slice(0, 4)}`;
}

function isUniqueViolation(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

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

  /**
   * The AROHA user behind a Supabase Auth account, created on first sign-in.
   * Two first requests can race; the loser re-reads the winner's row. A
   * handle collision (vanishingly rare) just draws a new suffix.
   */
  async ensureForAuth(identity: AuthIdentity) {
    const existing = await db.user.findUnique({ where: { authId: identity.authId } });
    if (existing) {
      if (identity.email && existing.email !== identity.email) {
        return db.user.update({ where: { id: existing.id }, data: { email: identity.email } });
      }
      return existing;
    }

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await db.user.create({
          data: {
            authId: identity.authId,
            email: identity.email,
            displayName: identity.displayName,
            handle: generateHandle(identity.displayName),
          },
        });
      } catch (error) {
        if (!isUniqueViolation(error)) throw error;
        const raced = await db.user.findUnique({ where: { authId: identity.authId } });
        if (raced) return raced;
      }
    }
    throw new Error("Could not create a user for this account");
  },
};
