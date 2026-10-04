/**
 * Integration tests write to the database in DATABASE_URL (throwaway users,
 * deleted afterwards). Refuse to run against anything but a local database,
 * so pointing .env at production can never turn a test run into writes
 * there. Set ALLOW_REMOTE_DB_TESTS=1 to run against a dedicated remote test
 * database on purpose.
 */
const url = process.env.DATABASE_URL;
const host = url ? new URL(url).hostname : "";
const local = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(host);

if (!local && process.env.ALLOW_REMOTE_DB_TESTS !== "1") {
  throw new Error(
    `Integration tests only run against a local database, but DATABASE_URL points at "${host || "nothing"}". ` +
      "Point .env at your local Postgres, or set ALLOW_REMOTE_DB_TESTS=1 for a dedicated test database.",
  );
}
