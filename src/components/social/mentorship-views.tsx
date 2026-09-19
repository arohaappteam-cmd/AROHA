import { ArrowRightIcon, HandshakeIcon } from "lucide-react";
import Link from "next/link";

import { CharacterAvatar } from "@/components/character/character-avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { tierForLevel } from "@/modules/progression/levels";
import { TIER_META, type MentorshipChain } from "@/modules/social/mentorship";
import type { SocialPerson } from "@/modules/social/types";
import type { MentorshipView } from "@/server/services/social.service";

import { EndMentorshipButton } from "./mentorship";
import { personLevel } from "./person-card";

const dayFormat = new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" });

function ChainLink({ person, role }: { person: SocialPerson; role: string }) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2.5">
      <CharacterAvatar appearance={person.avatar} name={person.displayName} tier={tierForLevel(personLevel(person))} size={36} />
      <div className="min-w-0">
        <Link href={`/community/people/${person.handle}`} className="block truncate text-sm font-medium underline-offset-4 hover:underline">
          {person.displayName}
        </Link>
        <p className="truncate text-xs text-muted-foreground">{role}</p>
      </div>
    </div>
  );
}

/** Expert → mentor → beginner: the shape mentorship takes in AROHA. */
export function MentorshipChainCard({ chains }: { chains: MentorshipChain[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HandshakeIcon className="size-4 text-primary" aria-hidden />
          How mentorship works here
        </CardTitle>
        <CardDescription>
          Expert → mentor → beginner. Almost everyone is in the middle: far enough along to help someone a few steps behind,
          still learning from someone ahead. You don&apos;t have to be an expert to be useful.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {chains.map((chain) => (
          <div key={chain.expert.handle} className="flex flex-col gap-2 rounded-xl border p-3 sm:flex-row sm:items-center">
            <ChainLink person={chain.expert} role={TIER_META.expert.label} />
            <ArrowRightIcon className="size-4 shrink-0 rotate-90 text-muted-foreground sm:rotate-0" aria-label="mentors" />
            <ChainLink person={chain.mentor} role={TIER_META.mentor.label} />
            <ArrowRightIcon className="size-4 shrink-0 rotate-90 text-muted-foreground sm:rotate-0" aria-label="mentors" />
            <ChainLink person={chain.beginner} role={TIER_META.beginner.label} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function MentorshipList({ mentorships }: { mentorships: MentorshipView[] }) {
  return (
    <ul className="space-y-3">
      {mentorships.map((mentorship) => (
        <li key={mentorship.id} className="rounded-xl border p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-medium">
                {mentorship.role === "MENTEE" ? "Mentored by" : "Mentoring"}{" "}
                {mentorship.person ? (
                  <Link href={`/community/people/${mentorship.person.handle}`} className="underline underline-offset-4">
                    {mentorship.person.displayName}
                  </Link>
                ) : (
                  "a former member"
                )}
              </p>
              <p className="text-sm text-muted-foreground">
                {mentorship.topic} · started {dayFormat.format(mentorship.startedAt)}
              </p>
            </div>
            <Badge variant={mentorship.status === "ACTIVE" ? "secondary" : "outline"}>
              {mentorship.status === "ACTIVE" ? "Active" : "Closed"}
            </Badge>
          </div>

          {mentorship.message && <p className="mt-2 text-sm text-pretty text-muted-foreground">“{mentorship.message}”</p>}

          {mentorship.status === "ACTIVE" && (
            <>
              <p className="mt-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">How to make it work</p>
              <ol className="mt-1 space-y-1.5">
                {mentorship.plan.map((step, index) => (
                  <li key={step} className="flex gap-2.5 text-sm">
                    <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary/15 text-xs font-medium text-primary">{index + 1}</span>
                    <span className="text-pretty">{step}</span>
                  </li>
                ))}
              </ol>
              <div className="mt-2">
                <EndMentorshipButton mentorshipId={mentorship.id} />
              </div>
            </>
          )}
        </li>
      ))}
    </ul>
  );
}
