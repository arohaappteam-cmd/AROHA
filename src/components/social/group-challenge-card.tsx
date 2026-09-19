import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CharacterAvatar } from "@/components/character/character-avatar";
import { tierForLevel } from "@/modules/progression/levels";
import type { GroupChallengeView } from "@/server/services/social.service";

import { GroupChallengeButton } from "./membership-buttons";
import { personLevel } from "./person-card";

/**
 * A group challenge: the same commitment, attempted alongside other people.
 * Everyone's days are their own — the bars sit side by side, not in a ranking.
 */
export function GroupChallengeCard({ view }: { view: GroupChallengeView }) {
  const { challenge, guild, you } = view;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span aria-hidden className="text-xl">
            {challenge.emoji}
          </span>
          {challenge.title}
          {you.joined && <Badge variant="secondary">You&apos;re in</Badge>}
        </CardTitle>
        <CardDescription>
          {challenge.description} ·{" "}
          <Link href={`/community/guilds/${guild.slug}`} className="underline-offset-4 hover:underline">
            {guild.name}
          </Link>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground tabular-nums">
          Day {view.dayOfWindow} of {challenge.durationDays} · {challenge.targetDays} days needed
        </p>

        {you.joined && (
          <div className="rounded-xl border bg-muted/30 p-3">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="font-medium">Your days</span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {you.daysDone} / {challenge.targetDays}
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-primary/15">
              <div className="h-full rounded-full bg-primary" style={{ width: `${you.percent}%` }} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Earned by completing matching quests on your own journey — exactly as if you were doing it alone.
            </p>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Others taking part</p>
          <ul className="space-y-2">
            {view.participants.map(({ person, daysDone, percent }) => (
              <li key={person.handle} className="flex items-center gap-3">
                <CharacterAvatar appearance={person.avatar} name={person.displayName} tier={tierForLevel(personLevel(person))} size={28} />
                <Link href={`/community/people/${person.handle}`} className="w-28 shrink-0 truncate text-sm underline-offset-4 hover:underline">
                  {person.displayName}
                </Link>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-muted-foreground/50" style={{ width: `${percent}%` }} />
                </div>
                <span className="w-12 shrink-0 text-right text-xs text-muted-foreground tabular-nums">{daysDone}d</span>
              </li>
            ))}
          </ul>
        </div>

        <GroupChallengeButton groupKey={challenge.key} joined={you.joined} />
      </CardContent>
    </Card>
  );
}
