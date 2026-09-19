import { GraduationCapIcon, HandHeartIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { CommunityTabs, DemoNotice } from "@/components/social/community-chrome";
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
      <DemoNotice kind={hub.directoryKind} />

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

      {hub.mentorships.length > 0 && (
        <section aria-labelledby="yours-title" className="space-y-3">
          <h2 id="yours-title" className="text-lg font-semibold">
            Your mentorships
          </h2>
          <MentorshipList mentorships={hub.mentorships} />
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
            description="Mentor matching uses your interests and the skills you're building. Add interests or complete a few more quests and suggestions will appear."
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
    </div>
  );
}
