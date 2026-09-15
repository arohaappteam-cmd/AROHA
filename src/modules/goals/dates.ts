import { isValidTimezone } from "@/modules/identity/timezones";

const DAY_MS = 86_400_000;

/** Today's calendar date ("YYYY-MM-DD") in the given timezone. */
export function todayInTimezone(timezone: string, now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: isValidTimezone(timezone) ? timezone : "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** "YYYY-MM-DD" → Date at UTC midnight, matching Postgres DATE columns. */
export function parseDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

/** Date from a DATE column → "YYYY-MM-DD". */
export function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function daysBetween(fromDateOnly: string, toDateOnly: string): number {
  return Math.round((parseDateOnly(toDateOnly).getTime() - parseDateOnly(fromDateOnly).getTime()) / DAY_MS);
}

export type DeadlineState =
  | { kind: "none" }
  | { kind: "overdue"; days: number }
  | { kind: "today" }
  | { kind: "soon"; days: number }
  | { kind: "later"; days: number };

export function deadlineState(deadline: string | null, today: string): DeadlineState {
  if (!deadline) return { kind: "none" };
  const days = daysBetween(today, deadline);
  if (days < 0) return { kind: "overdue", days: -days };
  if (days === 0) return { kind: "today" };
  if (days <= 14) return { kind: "soon", days };
  return { kind: "later", days };
}

const displayFormat = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export function displayDateOnly(value: string): string {
  return displayFormat.format(parseDateOnly(value));
}

export function describeDeadline(deadline: string | null, today: string): string | null {
  const state = deadlineState(deadline, today);
  switch (state.kind) {
    case "none":
      return null;
    case "overdue":
      return `${state.days} day${state.days === 1 ? "" : "s"} past deadline`;
    case "today":
      return "Due today";
    case "soon":
      return `${state.days} day${state.days === 1 ? "" : "s"} left`;
    case "later":
      return `Due ${displayDateOnly(deadline!)}`;
  }
}
