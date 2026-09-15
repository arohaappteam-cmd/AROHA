/**
 * Seeded randomness so quest generation is deterministic: the same user,
 * day and slot always produce the same quest. Refreshing can never reshuffle.
 */

/** FNV-1a 32-bit hash. */
export function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** mulberry32: small, fast, good enough for picking quests. */
export function createRng(seed: string): () => number {
  let state = hashString(seed);
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Weighted pick; items with weight <= 0 are never chosen. */
export function weightedPick<T>(items: readonly T[], weight: (item: T) => number, rng: () => number): T | null {
  const weighted = items.map((item) => ({ item, w: Math.max(0, weight(item)) })).filter((x) => x.w > 0);
  const total = weighted.reduce((sum, x) => sum + x.w, 0);
  if (total === 0) return null;
  let roll = rng() * total;
  for (const { item, w } of weighted) {
    roll -= w;
    if (roll < 0) return item;
  }
  return weighted.at(-1)!.item;
}

export function pickOne<T>(items: readonly T[], rng: () => number): T | null {
  return items.length ? items[Math.floor(rng() * items.length)] : null;
}
