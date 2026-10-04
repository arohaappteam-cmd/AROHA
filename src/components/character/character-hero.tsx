import { CalendarDaysIcon, Clock3Icon, PencilIcon } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { CharacterSheet } from "@/server/services/character.service";

import { CharacterAvatar } from "./character-avatar";

const numberFormat = new Intl.NumberFormat("en");
const monthFormat = new Intl.DateTimeFormat("en", { month: "long", year: "numeric" });

export function CharacterHero({ sheet }: { sheet: CharacterSheet }) {
  const { user, character, progress } = sheet;

  return (
    <Card className="relative p-0">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,color-mix(in_oklch,var(--primary)_22%,transparent),transparent_55%),radial-gradient(ellipse_at_bottom_right,color-mix(in_oklch,var(--primary)_10%,transparent),transparent_50%)]"
      />
      <div className="relative flex flex-col gap-6 p-6 md:flex-row md:items-center md:gap-8 md:p-8">
        <CharacterAvatar
          appearance={character.appearance}
          name={user.displayName}
          tier={progress.tier}
          size={132}
          className="self-center md:self-auto"
        />

        <div className="min-w-0 flex-1 space-y-4">
          <div className="space-y-2 text-center md:text-left">
            <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
              <Badge variant="secondary">{progress.tier}</Badge>
              <span className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
                Level {progress.level}
              </span>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-balance md:text-4xl">
              {user.displayName}
              {user.pronouns && (
                <span className="ml-2 align-middle text-base font-normal text-muted-foreground">
                  {user.pronouns}
                </span>
              )}
            </h1>
            {character.motto ? (
              <p className="text-base text-pretty text-foreground/80 italic">
                &ldquo;{character.motto}&rdquo;
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                This is who you are — and who you&apos;re becoming through your actions.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <div
              role="progressbar"
              aria-label={`Progress to level ${progress.level + 1}`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress.percent}
              className="h-2 overflow-hidden rounded-full bg-muted"
            >
              <div
                className="h-full rounded-full bg-xp transition-[width] duration-500"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
              <span>{numberFormat.format(progress.totalXp)} XP total</span>
              <span>
                {numberFormat.format(progress.xpToNextLevel)} XP to level {progress.level + 1}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground md:justify-start">
            <span className="flex items-center gap-1.5">
              <CalendarDaysIcon className="size-3.5" aria-hidden />
              Journey began {monthFormat.format(user.memberSince)}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock3Icon className="size-3.5" aria-hidden />
              {user.timezone.replaceAll("_", " ")}
            </span>
          </div>
        </div>

        <Link
          href="/character/edit"
          className={buttonVariants({ variant: "outline", className: "self-center md:self-start" })}
        >
          <PencilIcon data-icon="inline-start" />
          Customize
        </Link>
      </div>
    </Card>
  );
}
