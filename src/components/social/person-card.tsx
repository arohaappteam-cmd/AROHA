import Link from "next/link";

import { CharacterAvatar } from "@/components/character/character-avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { levelForXp, tierForLevel } from "@/modules/progression/levels";
import { TIER_META } from "@/modules/social/mentorship";
import type { SocialPerson } from "@/modules/social/types";

/** Null when the member keeps their level private. */
export function personLevel(person: SocialPerson): number | null {
  return person.progress ? levelForXp(person.progress.totalXp) : null;
}

/** The avatar ring needs a tier either way; a hidden level draws the first one. */
export function personTier(person: SocialPerson) {
  return tierForLevel(personLevel(person) ?? 1);
}

/** "Level 4 · she/her", leaving out whatever they don't share. */
function personSubtitle(person: SocialPerson): string {
  const level = personLevel(person);
  return [level === null ? null : `Level ${level}`, person.pronouns].filter(Boolean).join(" · ");
}

export function TierBadge({ person, className }: { person: SocialPerson; className?: string }) {
  return (
    <Badge variant="outline" className={className} title={TIER_META[person.tier].description}>
      {TIER_META[person.tier].label}
    </Badge>
  );
}

/** One community member, with the reasons they were surfaced. Never a feed post. */
export function PersonCard({ person, reasons, className }: { person: SocialPerson; reasons?: string[]; className?: string }) {
  const subtitle = personSubtitle(person);
  return (
    <Card size="sm" className={cn("h-full", className)}>
      <CardContent className="flex h-full flex-col gap-3">
        <div className="flex items-start gap-3">
          <CharacterAvatar appearance={person.avatar} name={person.displayName} tier={personTier(person)} size={44} />
          <div className="min-w-0 flex-1">
            <Link href={`/community/people/${person.handle}`} className="font-medium underline-offset-4 hover:underline">
              {person.displayName}
            </Link>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <TierBadge person={person} />
        </div>

        {person.headline && <p className="text-sm text-pretty text-muted-foreground">{person.headline}</p>}

        {reasons && reasons.length > 0 && (
          <ul className="mt-auto space-y-1">
            {reasons.slice(0, 2).map((reason) => (
              <li key={reason} className="text-xs text-pretty text-muted-foreground">
                <span aria-hidden>· </span>
                {reason}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/** A compact row for member lists inside guild and challenge cards. */
export function PersonRow({ person, trailing }: { person: SocialPerson; trailing?: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 py-2">
      <CharacterAvatar appearance={person.avatar} name={person.displayName} tier={personTier(person)} size={32} />
      <div className="min-w-0 flex-1">
        <Link href={`/community/people/${person.handle}`} className="truncate text-sm font-medium underline-offset-4 hover:underline">
          {person.displayName}
        </Link>
        {person.headline && <p className="truncate text-xs text-muted-foreground">{person.headline}</p>}
      </div>
      {trailing}
    </li>
  );
}
