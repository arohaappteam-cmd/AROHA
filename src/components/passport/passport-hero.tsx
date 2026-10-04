import { BadgeCheckIcon, CrownIcon, FolderKanbanIcon, ScrollTextIcon, ShieldCheckIcon, SparklesIcon, TrophyIcon, WaypointsIcon } from "lucide-react";

import { CharacterAvatar } from "@/components/character/character-avatar";
import type { SkillPassport } from "@/server/services/passport.service";

const numberFormat = new Intl.NumberFormat("en");
const monthFormat = new Intl.DateTimeFormat("en", { month: "long", year: "numeric" });

/** A stable, passport-style document number derived from the user's id. */
function passportNumber(seed: string): string {
  let hash = 2166136261;
  for (const char of seed) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  const value = (hash >>> 0).toString(36).toUpperCase().padStart(7, "0").slice(0, 7);
  return `AR-${value.slice(0, 3)}-${value.slice(3)}`;
}

export function PassportHero({ passport, seed }: { passport: SkillPassport; seed: string }) {
  const { identity, stats } = passport;

  const figures = [
    { icon: ShieldCheckIcon, label: "Skills demonstrated", value: stats.skillsDemonstrated, accent: "text-emerald-500" },
    { icon: CrownIcon, label: "Mastered", value: stats.skillsMastered, accent: "text-amber-500" },
    { icon: FolderKanbanIcon, label: "Projects shipped", value: stats.projectsCompleted, accent: "text-violet-500" },
    { icon: BadgeCheckIcon, label: "Assessments passed", value: stats.assessmentsPassed, accent: "text-sky-500" },
    { icon: ScrollTextIcon, label: "Pieces of proof", value: stats.proofItems, accent: "text-teal-500" },
    { icon: TrophyIcon, label: "Achievements", value: stats.achievements, accent: "text-orange-500" },
    { icon: WaypointsIcon, label: "Challenges completed", value: stats.challengesCompleted, accent: "text-rose-500" },
    { icon: SparklesIcon, label: "Skills in practice", value: stats.skillsActive, accent: "text-primary" },
  ];

  return (
    <section aria-labelledby="passport-name" className="overflow-hidden rounded-3xl border bg-card shadow-sm">
      <div className="relative isolate overflow-hidden px-6 pt-6 pb-8 md:px-10 md:pt-8">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_left,color-mix(in_oklch,var(--primary)_32%,transparent),transparent_55%),radial-gradient(ellipse_at_bottom_right,color-mix(in_oklch,var(--primary)_22%,transparent),transparent_55%)]"
        />
        {/* Guilloche-style security pattern, like a real passport page. */}
        <svg aria-hidden className="absolute inset-0 -z-10 h-full w-full opacity-[0.07]" preserveAspectRatio="none">
          <defs>
            <pattern id="passport-waves" width="64" height="24" patternUnits="userSpaceOnUse">
              <path d="M0 12 C 16 0, 32 24, 48 12 S 80 0, 96 12" fill="none" stroke="currentColor" strokeWidth="1" />
              <path d="M0 18 C 16 6, 32 30, 48 18 S 80 6, 96 18" fill="none" stroke="currentColor" strokeWidth="0.6" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#passport-waves)" />
        </svg>

        <div className="flex items-center justify-between gap-4 text-[11px] font-medium tracking-[0.25em] text-muted-foreground uppercase">
          <span>AROHA · Skill Passport</span>
          <span className="font-mono tracking-[0.15em]">{passportNumber(seed)}</span>
        </div>

        <div className="mt-6 flex flex-col items-center gap-6 text-center md:flex-row md:items-center md:gap-8 md:text-left">
          <div className="rounded-3xl bg-background/60 p-2 ring-1 ring-foreground/10 backdrop-blur">
            <CharacterAvatar appearance={identity.appearance} name={identity.displayName} tier={identity.tier} size={128} />
          </div>
          <div className="min-w-0 flex-1 space-y-3">
            <div className="space-y-1">
              <p className="text-xs font-medium tracking-[0.18em] text-primary uppercase">
                {identity.tier} · Level {identity.level}
              </p>
              <h1 id="passport-name" className="text-3xl font-semibold tracking-tight text-balance md:text-4xl">
                {identity.displayName}
                {identity.pronouns && <span className="ml-2 align-middle text-base font-normal text-muted-foreground">{identity.pronouns}</span>}
              </h1>
              {identity.motto && <p className="text-base text-foreground/80 italic">&ldquo;{identity.motto}&rdquo;</p>}
            </div>
            {identity.bio && <p className="max-w-prose text-sm text-muted-foreground">{identity.bio}</p>}
            <dl className="flex flex-wrap justify-center gap-x-6 gap-y-1 text-xs md:justify-start">
              <div className="flex gap-1.5">
                <dt className="text-muted-foreground">Holder since</dt>
                <dd className="font-medium">{monthFormat.format(identity.memberSince)}</dd>
              </div>
              <div className="flex gap-1.5">
                <dt className="text-muted-foreground">Total XP</dt>
                <dd className="font-medium tabular-nums">{numberFormat.format(identity.totalXp)}</dd>
              </div>
              <div className="flex gap-1.5">
                <dt className="text-muted-foreground">Standard</dt>
                <dd className="font-medium">Proof over claims</dd>
              </div>
            </dl>
          </div>
          <div
            aria-hidden
            className="hidden size-28 shrink-0 rotate-[-12deg] place-items-center rounded-full border-2 border-dashed border-primary/40 text-center text-[10px] leading-tight font-semibold tracking-[0.2em] text-primary/70 uppercase lg:grid"
          >
            Verified
            <br />
            by action
          </div>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-px border-t bg-border sm:grid-cols-4">
        {figures.map((figure) => (
          <div key={figure.label} className="flex items-center gap-3 bg-card px-5 py-4">
            <figure.icon className={`size-5 shrink-0 ${figure.accent}`} aria-hidden />
            <div className="flex min-w-0 flex-col-reverse">
              <dt className="mt-1 truncate text-xs text-muted-foreground">{figure.label}</dt>
              <dd className="text-2xl leading-none font-semibold tabular-nums">{figure.value}</dd>
            </div>
          </div>
        ))}
      </dl>
    </section>
  );
}
