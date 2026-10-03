import { ArrowRightIcon, HandshakeIcon, MessageSquareTextIcon } from "lucide-react";
import Link from "next/link";

import { CharacterAvatar } from "@/components/character/character-avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TIER_META, type MentorshipChain } from "@/modules/social/mentorship";
import type { SocialPerson } from "@/modules/social/types";
import type { MentorshipView } from "@/server/services/social.service";

import { EndMentorshipButton, RespondButtons } from "./mentorship";
import { personTier } from "./person-card";

const dayFormat = new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" });

function ChainLink({ person, role }: { person: SocialPerson; role: string }) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2.5">
      <CharacterAvatar appearance={person.avatar} name={person.displayName} tier={personTier(person)} size={36} />
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
      {chains.length > 0 && (
        <CardContent className="space-y-4">
          {chains.map((chain) => (
            <div key={`${chain.expert.handle}-${chain.beginner.handle}`} className="flex flex-col gap-2 rounded-xl border p-3 sm:flex-row sm:items-center">
              <ChainLink person={chain.expert} role={TIER_META.expert.label} />
              <ArrowRightIcon className="size-4 shrink-0 rotate-90 text-muted-foreground sm:rotate-0" aria-label="mentors" />
              <ChainLink person={chain.mentor} role={TIER_META.mentor.label} />
              <ArrowRightIcon className="size-4 shrink-0 rotate-90 text-muted-foreground sm:rotate-0" aria-label="mentors" />
              <ChainLink person={chain.beginner} role={TIER_META.beginner.label} />
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  );
}

/** The other member's name, linked while their profile is visible. */
function CounterpartName({ mentorship }: { mentorship: MentorshipView }) {
  return mentorship.person ? (
    <Link href={`/community/people/${mentorship.counterpart.handle}`} className="underline underline-offset-4">
      {mentorship.counterpart.displayName}
    </Link>
  ) : (
    <>{mentorship.counterpart.displayName}</>
  );
}

function headline(mentorship: MentorshipView) {
  const { status, direction, role } = mentorship;
  if (status === "PENDING" && direction === "incoming") {
    return role === "MENTOR" ? ["", " asked you to mentor them"] : ["", " offered to mentor you"];
  }
  if (status === "PENDING") return role === "MENTEE" ? ["You asked ", " to mentor you"] : ["You offered to mentor ", ""];
  return role === "MENTEE" ? ["Mentored by ", ""] : ["Mentoring ", ""];
}

const STATUS_BADGE: Record<MentorshipView["status"], { label: string; variant: "secondary" | "outline" }> = {
  PENDING: { label: "Waiting", variant: "outline" },
  ACTIVE: { label: "Active", variant: "secondary" },
  DECLINED: { label: "Declined", variant: "outline" },
  ENDED: { label: "Closed", variant: "outline" },
};

export function MentorshipList({ mentorships }: { mentorships: MentorshipView[] }) {
  return (
    <ul className="space-y-3">
      {mentorships.map((mentorship) => {
        const [before, after] = headline(mentorship);
        const badge = mentorship.status === "PENDING" && mentorship.direction === "incoming" ? { label: "Needs your answer", variant: "secondary" as const } : STATUS_BADGE[mentorship.status];
        return (
          <li key={mentorship.id} className="rounded-xl border p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium">
                  {before}
                  <CounterpartName mentorship={mentorship} />
                  {after}
                </p>
                <p className="text-sm text-muted-foreground">
                  {mentorship.topic} · {dayFormat.format(mentorship.startedAt)}
                </p>
              </div>
              <Badge variant={badge.variant}>{badge.label}</Badge>
            </div>

            {mentorship.message && <p className="mt-2 text-sm text-pretty text-muted-foreground">“{mentorship.message}”</p>}

            {mentorship.status === "PENDING" && (
              <div className="mt-3">
                {mentorship.direction === "incoming" ? (
                  <RespondButtons mentorshipId={mentorship.id} />
                ) : (
                  <EndMentorshipButton mentorshipId={mentorship.id} label="Withdraw request" />
                )}
              </div>
            )}

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
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Link href={`/community/mentorship/${mentorship.id}`} className={buttonVariants({ size: "sm" })}>
                    <MessageSquareTextIcon data-icon="inline-start" />
                    Notes
                  </Link>
                  <EndMentorshipButton mentorshipId={mentorship.id} />
                </div>
              </>
            )}

            {mentorship.status === "ENDED" && (
              <Link href={`/community/mentorship/${mentorship.id}`} className="mt-2 inline-block text-sm text-muted-foreground underline-offset-4 hover:underline">
                Read the notes
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
