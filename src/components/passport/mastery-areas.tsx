import Link from "next/link";

import type { MasteryArea } from "@/server/services/passport.service";
import { Glyph } from "@/components/common/glyph";

const numberFormat = new Intl.NumberFormat("en");

function Ring({ demonstrated, active, total }: { demonstrated: number; active: number; total: number }) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const activeLength = (active / total) * circumference;
  const provenLength = (demonstrated / total) * circumference;
  return (
    <svg viewBox="0 0 80 80" className="size-20 -rotate-90" aria-hidden>
      <circle cx="40" cy="40" r={radius} fill="none" className="stroke-muted" strokeWidth="7" />
      <circle
        cx="40"
        cy="40"
        r={radius}
        fill="none"
        className="stroke-success/35"
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={`${activeLength} ${circumference}`}
      />
      <circle
        cx="40"
        cy="40"
        r={radius}
        fill="none"
        className="stroke-success"
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={`${provenLength} ${circumference}`}
      />
    </svg>
  );
}

/** The trees where proof is strongest — the user's mastery areas (spec §21). */
export function MasteryAreas({ areas }: { areas: MasteryArea[] }) {
  if (areas.length === 0) return null;
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {areas.map((area) => (
        <li key={area.slug}>
          <Link
            href={`/skills/${area.slug}`}
            className="flex h-full items-center gap-4 rounded-2xl border bg-card p-4 transition-colors hover:border-primary/50"
          >
            <div className="relative grid place-items-center">
              <Ring demonstrated={area.skillsDemonstrated} active={area.skillsActive} total={area.totalSkills} />
              <span className="absolute text-2xl" aria-hidden>
                <Glyph emoji={area.emoji} />
              </span>
            </div>
            <div className="min-w-0 space-y-0.5">
              <p className="font-semibold">{area.name}</p>
              <p className="text-xs text-muted-foreground tabular-nums">
                <span className="font-medium text-emerald-600 dark:text-emerald-300">{area.skillsDemonstrated} proven</span> ·{" "}
                {area.skillsActive} of {area.totalSkills} active
              </p>
              {area.skillsMastered > 0 && (
                <p className="text-xs font-medium text-amber-600 tabular-nums dark:text-amber-300">{area.skillsMastered} mastered</p>
              )}
              <p className="text-xs text-muted-foreground tabular-nums">{numberFormat.format(area.xp)} skill XP</p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
