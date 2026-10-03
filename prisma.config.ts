import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * The CLI (migrate, seed, studio) prefers DIRECT_URL: migrations take
 * advisory locks and run DDL, which a transaction-mode pooler can't hold.
 * The app itself connects through DATABASE_URL (the pooler on Vercel).
 * Locally both can be the same database, so DIRECT_URL is optional.
 */
const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required (see .env.example)");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url,
  },
});
