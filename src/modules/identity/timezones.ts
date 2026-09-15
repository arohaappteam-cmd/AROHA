export function isValidTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Maps a timezone (possibly a legacy alias like "Asia/Calcutta") to the
 * matching entry in `options`, e.g. "Asia/Kolkata". Falls back to the input.
 */
export function matchTimezone(timezone: string, options: readonly string[]): string {
  if (options.includes(timezone) || !isValidTimezone(timezone)) return timezone;
  const canonical = (zone: string) =>
    new Intl.DateTimeFormat("en", { timeZone: zone }).resolvedOptions().timeZone;
  const target = canonical(timezone);
  return options.find((zone) => canonical(zone) === target) ?? timezone;
}

export function listTimezones(): string[] {
  const zones = Intl.supportedValuesOf("timeZone");
  return zones.includes("UTC") ? zones : ["UTC", ...zones];
}

/** Hour of day (0–23) in the given timezone. */
export function hourInTimezone(date: Date, timezone: string): number {
  const hour = new Intl.DateTimeFormat("en-GB", {
    hour: "numeric",
    hourCycle: "h23",
    timeZone: isValidTimezone(timezone) ? timezone : "UTC",
  }).format(date);
  return Number(hour);
}

export function greetingFor(hour: number): string {
  if (hour < 5) return "Good evening";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}
