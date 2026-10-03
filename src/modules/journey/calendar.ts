import { shiftDate, type DayWindow } from "@/modules/analytics/dataset";
import { daysBetween, parseDateOnly } from "@/modules/goals/dates";

/**
 * Calendar arithmetic for the Journey screen. Dates are "YYYY-MM-DD" calendar
 * days in the user's timezone, so plain string comparison orders them; weeks
 * start on Monday.
 */

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

/** 0 = Monday … 6 = Sunday. */
export function weekdayIndex(date: string): number {
  return (parseDateOnly(date).getUTCDay() + 6) % 7;
}

export function mondayOf(date: string): string {
  return shiftDate(date, -weekdayIndex(date));
}

export function firstOfMonth(date: string): string {
  return `${date.slice(0, 7)}-01`;
}

export function lastOfMonth(date: string): string {
  const [year, month] = date.split("-").map(Number);
  // Day 0 of the next month is the last day of this one.
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}

/** Every day in the window, oldest first. */
export function eachDay(window: DayWindow): string[] {
  const length = daysBetween(window.from, window.to) + 1;
  return Array.from({ length: Math.max(0, length) }, (_, index) => shiftDate(window.from, index));
}

export function earlier(a: string, b: string): string {
  return a < b ? a : b;
}

export function later(a: string, b: string): string {
  return a > b ? a : b;
}

// ─── Labels ──────────────────────────────────────────────────────────────────

const formats = {
  dayMonth: new Intl.DateTimeFormat("en", { day: "numeric", month: "short", timeZone: "UTC" }),
  weekdayDay: new Intl.DateTimeFormat("en", { weekday: "short", day: "numeric", timeZone: "UTC" }),
  longDay: new Intl.DateTimeFormat("en", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }),
  month: new Intl.DateTimeFormat("en", { month: "short", timeZone: "UTC" }),
  monthYear: new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "UTC" }),
  shortMonthYear: new Intl.DateTimeFormat("en", { month: "short", year: "numeric", timeZone: "UTC" }),
};

export type DateFormat = keyof typeof formats;

export function formatDay(date: string, format: DateFormat): string {
  return formats[format].format(parseDateOnly(date));
}

// ─── Ranges ──────────────────────────────────────────────────────────────────

export const JOURNEY_RANGES = {
  "7d": { label: "7 days", short: "7D", days: 7 },
  "30d": { label: "30 days", short: "30D", days: 30 },
  "90d": { label: "90 days", short: "90D", days: 90 },
  "6m": { label: "6 months", short: "6M", days: 182 },
  "1y": { label: "1 year", short: "1Y", days: 365 },
  all: { label: "All time", short: "ALL", days: null },
} as const;

export type JourneyRangeKey = keyof typeof JOURNEY_RANGES;
export const JOURNEY_RANGE_KEYS = Object.keys(JOURNEY_RANGES) as JourneyRangeKey[];
export const DEFAULT_JOURNEY_RANGE: JourneyRangeKey = "30d";

export function resolveJourneyRange(value: unknown): JourneyRangeKey {
  return typeof value === "string" && value in JOURNEY_RANGES ? (value as JourneyRangeKey) : DEFAULT_JOURNEY_RANGE;
}

export type RangeWindows = {
  key: JourneyRangeKey;
  label: string;
  window: DayWindow;
  /** The same length of time just before; null for "all time". */
  previous: DayWindow | null;
  days: number;
};

/** The window a range covers. "All time" starts at the first recorded activity. */
export function rangeWindows(key: JourneyRangeKey, today: string, firstActivity: string | null): RangeWindows {
  const { days, label } = JOURNEY_RANGES[key];
  if (days === null) {
    const from = firstActivity && firstActivity < today ? firstActivity : today;
    return { key, label, window: { from, to: today }, previous: null, days: daysBetween(from, today) + 1 };
  }
  const window = { from: shiftDate(today, -(days - 1)), to: today };
  return { key, label, window, previous: { from: shiftDate(window.from, -days), to: shiftDate(window.from, -1) }, days };
}

export type BucketSize = "day" | "week" | "month";

/** Daily points up to ~3 months, weekly up to a year, monthly beyond. */
export function bucketSizeFor(days: number): BucketSize {
  if (days <= 92) return "day";
  if (days <= 400) return "week";
  return "month";
}

export type Bucket = DayWindow & { key: string; label: string; title: string };

/** Contiguous buckets covering the window, clipped at both ends. */
export function buckets(window: DayWindow, size: BucketSize): Bucket[] {
  const result: Bucket[] = [];
  let start = window.from;
  while (start <= window.to) {
    const naturalEnd = size === "day" ? start : size === "week" ? shiftDate(mondayOf(start), 6) : lastOfMonth(start);
    const end = earlier(naturalEnd, window.to);
    result.push({
      key: start,
      from: start,
      to: end,
      label: size === "month" ? formatDay(start, "month") : formatDay(start, "dayMonth"),
      title:
        size === "day"
          ? formatDay(start, "longDay")
          : size === "week"
            ? `Week of ${formatDay(mondayOf(start), "dayMonth")}`
            : formatDay(start, "monthYear"),
    });
    start = shiftDate(end, 1);
  }
  return result;
}
