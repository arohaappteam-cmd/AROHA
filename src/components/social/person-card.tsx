import Link from "next/link";

import { CharacterAvatar } from "@/components/character/character-avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { levelForXp, tierForLevel } from "@/modules/progression/levels";
import { TIER_META } from "@/modules/social/mentorship";
import type { SocialPerson } from "@/modules/social/types";

export function personLevel(person: SocialPerson): number {
  return levelForXp(person.totalXp);
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
  const level = personLevel(person);
  return (
    <Card size="sm" className={cn("h-full", className)}>
      <CardContent className="flex h-full flex-col gap-3">
        <div className="flex items-start gap-3">
          <CharacterAvatar appearance={person.avatar} name={person.displayName} tier={tierForLevel(level)} size={44} />
          <div className="min-w-0 flex-1">
            <Link href={`/community/people/${person.handle}`} className="font-medium underline-offset-4 hover:underline">
              {person.displayName}
            </Link>
            <p className="text-xs text-muted-foreground">
              Level {level} · {person.location}
            </p>
          </div>
          <TierBadge person={person} />
        </div>

        <p className="text-sm text-pretty text-muted-foreground">{person.headline}</p>

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
  const level = personLevel(person);
  return (
    <li className="flex items-center gap-3 py-2">
      <CharacterAvatar appearance={person.avatar} name={person.displayName} tier={tierForLevel(level)} size={32} />
      <div className="min-w-0 flex-1">
        <Link href={`/community/people/${person.handle}`} className="truncate text-sm font-medium underline-offset-4 hover:underline">
          {person.displayName}
        </Link>
        <p className="truncate text-xs text-muted-foreground">{person.headline}</p>
      </div>
      {trailing}
    </li>
  );
}
