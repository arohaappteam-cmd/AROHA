/**
 * Vercel's build step (vercel.json → buildCommand).
 *
 * Production builds apply pending migrations and refresh the skill and
 * achievement catalogues before building, so a deploy can never run code
 * against a schema it doesn't match. Preview builds skip both: a preview of
 * an unmerged branch must never migrate the shared database. Set
 * MIGRATE_ON_BUILD=1 to migrate on a preview anyway (e.g. a separate
 * preview database).
 */
import { execSync } from "node:child_process";

const run = (command) => {
  console.log(`\n▶ ${command}`);
  execSync(command, { stdio: "inherit" });
};

const migrate = process.env.VERCEL_ENV === "production" || process.env.MIGRATE_ON_BUILD === "1";

run("prisma generate");
if (migrate) {
  run("prisma migrate deploy");
  run("prisma db seed");
} else {
  console.log(`\nSkipping migrations for a ${process.env.VERCEL_ENV ?? "local"} build.`);
}
run("next build");
