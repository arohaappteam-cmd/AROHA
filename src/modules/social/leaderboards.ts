/**
 * Leaderboards (spec §46) are deliberately the smallest part of the community
 * layer, and they are optional twice over: nobody appears on one without
 * opting in, and no board is shown until the user asks for it.
 *
 * The comparison AROHA leads with is always the same one: you against your
 * own previous month. That's the number on top of the page; the community
 * boards sit underneath it, behind a choice.
 */

export const LEADERBOARD_METRICS = [
  {
    key: "xp",
    label: "XP earned",
    description: "Experience earned in the last 28 days.",
    unit: "XP",
    caption: "Everyone's days look different — this counts activity, not worth.",
  },
  {
    key: "challenges",
    label: "Challenges completed",
    description: "Challenges carried all the way to their target.",
    unit: "challenges",
    caption: "Counts finished commitments, however long the person has been here.",
  },
  {
    key: "achievements",
    label: "Achievements",
    description: "Achievements unlocked, all time.",
    unit: "achievements",
    caption: "Older accounts have had more time to collect these.",
  },
  {
    key: "progress",
    label: "Own improvement",
    description: "Change against that person's own previous 28 days.",
    unit: "%",
    caption: "The only board where everyone is measured against themselves.",
  },
] as const;

export type LeaderboardMetric = (typeof LEADERBOARD_METRICS)[number]["key"];
export const DEFAULT_METRIC: LeaderboardMetric = "progress";

export function resolveMetric(value: unknown): LeaderboardMetric | null {
  return typeof value === "string" && LEADERBOARD_METRICS.some((metric) => metric.key === value)
    ? (value as LeaderboardMetric)
    : null;
}

export function metricMeta(metric: LeaderboardMetric) {
  return LEADERBOARD_METRICS.find((entry) => entry.key === metric)!;
}

/** One competitor's numbers. The viewer is an entry like any other. */
export type BoardSubject = {
  handle: string;
  name: string;
  isViewer: boolean;
  xpRecent: number;
  xpPrevious: number;
  challengesCompleted: number;
  achievements: number;
};

export type BoardRow = {
  rank: number;
  handle: string;
  name: string;
  isViewer: boolean;
  value: number;
  /** Formatted for display, e.g. "+18%" or "1,180". */
  display: string;
};

/**
 * Improvement needs a baseline worth comparing to: below this, a couple of
 * quests would read as a triple-digit percentage.
 */
export const MIN_IMPROVEMENT_BASELINE = 100;

const numberFormat = new Intl.NumberFormat("en");

function valueOf(subject: BoardSubject, metric: LeaderboardMetric): number | null {
  switch (metric) {
    case "xp":
      return subject.xpRecent;
    case "challenges":
      return subject.challengesCompleted;
    case "achievements":
      return subject.achievements;
    case "progress":
      return subject.xpPrevious >= MIN_IMPROVEMENT_BASELINE
        ? Math.round(((subject.xpRecent - subject.xpPrevious) / subject.xpPrevious) * 100)
        : null;
  }
}

function display(value: number, metric: LeaderboardMetric): string {
  return metric === "progress" ? `${value > 0 ? "+" : ""}${value}%` : numberFormat.format(value);
}

/**
 * Ranks the subjects on one metric. Equal values share a rank, and anyone the
 * metric can't fairly measure (too small a baseline) is simply left off.
 */
export function buildBoard(subjects: readonly BoardSubject[], metric: LeaderboardMetric, limit = 10): BoardRow[] {
  const scored = subjects
    .flatMap((subject) => {
      const value = valueOf(subject, metric);
      return value === null ? [] : [{ subject, value }];
    })
    .sort((a, b) => b.value - a.value || a.subject.name.localeCompare(b.subject.name));

  const rows: BoardRow[] = [];
  let lastValue: number | null = null;
  let lastRank = 0;
  scored.forEach((entry, index) => {
    const rank = lastValue !== null && entry.value === lastValue ? lastRank : index + 1;
    lastValue = entry.value;
    lastRank = rank;
    rows.push({
      rank,
      handle: entry.subject.handle,
      name: entry.subject.name,
      isViewer: entry.subject.isViewer,
      value: entry.value,
      display: display(entry.value, metric),
    });
  });

  const top = rows.slice(0, limit);
  // The viewer always sees their own row, even when it falls below the cut.
  const viewer = rows.find((row) => row.isViewer);
  if (viewer && !top.some((row) => row.isViewer)) top.push(viewer);
  return top;
}

// ─── You against your previous self ─────────────────────────────────────────

export type SelfComparison = {
  key: string;
  label: string;
  current: number;
  previous: number;
  /** Whole-number change; percent is null when there's no baseline to compare to. */
  change: number;
  percent: number | null;
  /** Plain words for the change, e.g. "8 more than the 28 days before". */
  summary: string;
};

export function compareToPreviousSelf(
  entries: readonly { key: string; label: string; current: number; previous: number; unit?: string }[],
): SelfComparison[] {
  return entries.map(({ key, label, current, previous, unit }) => {
    const change = current - previous;
    const percent = previous > 0 ? Math.round((change / previous) * 100) : null;
    const noun = unit ? ` ${unit}` : "";
    const summary =
      previous === 0 && current === 0
        ? "Nothing in either period"
        : previous === 0
          ? `New ground — nothing in the 28 days before`
          : change === 0
            ? "Exactly the same as the 28 days before"
            : `${numberFormat.format(Math.abs(change))}${noun} ${change > 0 ? "more" : "fewer"} than the 28 days before`;
    return { key, label, current, previous, change, percent, summary };
  });
}
