import { GraduationCapIcon, HandHeartIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { CommunityTabs, PrivateProfileNotice } from "@/components/social/community-chrome";
import { MentorshipRequestToggle } from "@/components/social/mentorship";
import { MentorshipChainCard, MentorshipList } from "@/components/social/mentorship-views";
import { PersonCard } from "@/components/social/person-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TIER_META } from "@/modules/social/mentorship";
import { getCurrentUser } from "@/server/auth/current-user";
import { getMentorshipHub } from "@/server/services/social.service";

export const metadata: Metadata = { title: "Mentorship" };

export default async function MentorshipPage() {
  await connection();
  const user = await getCurrentUser();
  const hub = await getMentorshipHub(user);
  const { viewer } = hub;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Community"
        title="Mentorship"
        description="Someone a few steps ahead of you, and someone a few steps behind. Both halves are useful, and most people are in the middle."
      />
      <CommunityTabs active="/community/mentorship" />
      <PrivateProfileNotice visibility={viewer.settings.visibility} />

      <MentorshipChainCard chains={hub.chains} />

      <Card>
        <CardHeader>
          <CardTitle>Where you are</CardTitle>
          <CardDescription>Read from the skills you&apos;ve actually built, not from how long you&apos;ve been here.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="flex flex-wrap items-center gap-2 text-sm">
            <Badge variant="secondary">{TIER_META[viewer.mentorTier].label}</Badge>
            <span className="text-muted-foreground text-pretty">{TIER_META[viewer.mentorTier].description}</span>
          </p>
          {viewer.canMentorIn.length > 0 ? (
            <p className="text-sm text-muted-foreground">
              You could mentor someone in {viewer.canMentorIn.join(", ")} — you&apos;ve taken those past level 3.
              {!(viewer.settings.visibility === "COMMUNITY" && viewer.settings.openToMentoring) && (
                <>
                  {" "}
                  Make your profile visible and turn on &ldquo;open to mentoring&rdquo; so people can ask you.{" "}
                  <Link href="/community/profile" className="underline underline-offset-4">
                    Your sharing
                  </Link>
                </>
              )}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Take any skill past level 3 and people looking for help with it will appear here.{" "}
              <Link href="/skills" className="underline underline-offset-4">
                Your skills
              </Link>
            </p>
          )}
        </CardContent>
      </Card>

      {hub.incoming.length > 0 && (
        <section aria-labelledby="incoming-title" className="space-y-3">
          <h2 id="incoming-title" className="text-lg font-semibold">
            Waiting on your answer
          </h2>
          <MentorshipList mentorships={hub.incoming} />
        </section>
      )}

      {hub.active.length > 0 && (
        <section aria-labelledby="active-title" className="space-y-3">
          <h2 id="active-title" className="text-lg font-semibold">
            Your mentorships
          </h2>
          <MentorshipList mentorships={hub.active} />
        </section>
      )}

      {hub.outgoing.length > 0 && (
        <section aria-labelledby="outgoing-title" className="space-y-3">
          <h2 id="outgoing-title" className="text-lg font-semibold">
            Requests you&apos;ve sent
          </h2>
          <MentorshipList mentorships={hub.outgoing} />
        </section>
      )}

      <section aria-labelledby="mentors-title" className="space-y-3">
        <div className="flex items-baseline gap-2">
          <GraduationCapIcon className="size-4 text-primary" aria-hidden />
          <h2 id="mentors-title" className="text-lg font-semibold">
            Mentors who could help you
          </h2>
        </div>
        {hub.mentors.length === 0 ? (
          <EmptyState
            icon={GraduationCapIcon}
            title="No matches yet"
            description="Mentors are members who made their profile visible, said they're open to mentoring, and have taken a skill past level 3. Matches use your interests and the skills you're building — check back as the community grows."
          />
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {hub.mentors.map((match) => (
              <li key={match.person.handle} className="space-y-2">
                <PersonCard person={match.person} reasons={match.reasons} />
                <MentorshipRequestToggle
                  handle={match.person.handle}
                  name={match.person.displayName}
                  role="MENTEE"
                  topics={match.topics}
                  label={`Ask ${match.person.displayName.split(" ")[0]} for mentorship`}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {hub.mentees.length > 0 && (
        <section aria-labelledby="mentees-title" className="space-y-3">
          <div className="flex items-baseline gap-2">
            <HandHeartIcon className="size-4 text-primary" aria-hidden />
            <h2 id="mentees-title" className="text-lg font-semibold">
              People you could help
            </h2>
          </div>
          <p className="max-w-prose text-sm text-muted-foreground">
            You don&apos;t need to be an expert. Being two steps ahead is usually more useful, because you remember what the last
            step felt like.
          </p>
          <ul className="grid gap-4 md:grid-cols-2">
            {hub.mentees.map((match) => (
              <li key={match.person.handle} className="space-y-2">
                <PersonCard person={match.person} reasons={match.reasons} />
                <MentorshipRequestToggle
                  handle={match.person.handle}
                  name={match.person.displayName}
                  role="MENTOR"
                  topics={match.topics}
                  label={`Offer to help ${match.person.displayName.split(" ")[0]}`}
                />
              </li>
            ))}
          </ul>
        </section>
      )}
      {hub.past.length > 0 && (
        <details className="rounded-xl border p-4">
          <summary className="cursor-pointer text-sm font-medium">Past mentorships and requests ({hub.past.length})</summary>
          <div className="mt-3">
            <MentorshipList mentorships={hub.past} />
          </div>
        </details>
      )}
    </div>
  );
}
