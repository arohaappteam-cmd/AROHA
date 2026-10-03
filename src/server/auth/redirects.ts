const PROBE_ORIGIN = "https://aroha.invalid";

/**
 * Only same-site paths, so `?next=` can't send anyone off to another site.
 * Parsed the way a browser will parse it (which drops tabs and newlines and
 * reads `\` as `/`), then kept only if it still lands on this origin.
 */
export function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith("/")) return "/";
  try {
    const url = new URL(next, PROBE_ORIGIN);
    if (url.origin !== PROBE_ORIGIN) return "/";
    const path = `${url.pathname}${url.search}${url.hash}`;
    return path.startsWith("//") ? "/" : path;
  } catch {
    return "/";
  }
}
