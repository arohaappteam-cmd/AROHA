import "server-only";

/**
 * Memoises a read of catalogue data — skill trees and skills — that only
 * changes when `db:seed` runs during a deploy. A warm server instance then
 * answers from memory instead of re-reading the same rows on every page.
 *
 * Production only: in development and tests every call reads the database,
 * so seed and catalogue edits show up immediately. The TTL bounds how long
 * an instance that outlives a deploy can serve the previous catalogue.
 */
export function cachedCatalogue<T>(load: () => Promise<T>, ttlMs = 10 * 60_000): () => Promise<T> {
  let cached: { value: Promise<T>; expires: number } | undefined;

  return () => {
    if (process.env.NODE_ENV !== "production") return load();
    const now = Date.now();
    if (cached && cached.expires > now) return cached.value;

    const value = load();
    cached = { value, expires: now + ttlMs };
    // Never keep a failed read: the next call tries the database again.
    value.catch(() => {
      if (cached?.value === value) cached = undefined;
    });
    return value;
  };
}
