import { ArrowRightIcon, CompassIcon, UsersIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { CommunityTabs, PrivateProfileNotice } from "@/components/social/community-chrome";
import { GroupChallengeCard } from "@/components/social/group-challenge-card";
import { GuildCard } from "@/components/social/guild-cards";
import { MentorshipChainCard, MentorshipList } from "@/components/social/mentorship-views";
import { PersonCard } from "@/components/social/person-card";
import { SelfComparisonCard } from "@/components/social/self-comparison";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentUser } from "@/server/auth/current-user";
import { getCommunityOverview } from "@/server/services/social.service";

export const metadata: Metadata = { title: "Community" };

export default async function CommunityPage() {
  await connection();
  const user = await getCurrentUser();
  const overview = await getCommunityOverview(user);
  const { viewer, guilds } = overview;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Community"
        title="People doing the same work"
        description="Guilds, group challenges and mentorship — company for the parts of growth that are easier with someone else. There is no feed here."
        actions={
          <Link href="/community/profile" className={buttonVariants({ variant: "outline", size: "sm" })}>
            {viewer.settings.visibility === "PRIVATE" ? "Profile: private" : "Profile: visible"}
          </Link>
        }
      />
      <CommunityTabs active="/community" />
      <PrivateProfileNotice visibility={viewer.settings.visibility} />

      <SelfComparisonCard comparison={overview.comparison} compact />

      <section aria-labelledby="discovery-title" className="space-y-3">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="discovery-title" className="text-lg font-semibold">
            People who share your interests
          </h2>
          <span className="text-xs text-muted-foreground">Matched on what you have in common</span>
        </div>
        {viewer.interests.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Add a few interests on your{" "}
            <Link href="/character/edit#interests" className="underline underline-offset-4">
              character page
            </Link>{" "}
            and this becomes about you.
          </p>
        )}
        {overview.discovery.length === 0 && (
          <EmptyState
            icon={UsersIcon}
            title="Nobody else is visible yet"
            description="People appear here once they make their community profile visible. Make yours visible so others can find you too."
            action={
              <Link href="/community/profile" className={buttonVariants({ variant: "outline", size: "sm" })}>
                Your sharing
              </Link>
            }
          />
        )}
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {overview.discovery.map((match) => (
            <li key={match.subject.handle}>
              <PersonCard person={match.subject} reasons={match.reasons} />
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="guilds-title" className="space-y-3">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="guilds-title" className="text-lg font-semibold">
            {guilds.joined.length > 0 ? "Your guilds" : "Guilds worth a look"}
          </h2>
          <Link href="/community/guilds" className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
            All guilds
          </Link>
        </div>
        <ul className="grid gap-4 md:grid-cols-2">
          {(guilds.joined.length > 0 ? guilds.joined : guilds.suggested.map((match) => ({ guild: match.subject, joined: false, reasons: match.reasons })))
            .slice(0, 2)
            .map((card) => (
              <li key={card.guild.slug}>
                <GuildCard guild={card.guild} joined={card.joined} reasons={card.reasons} />
              </li>
            ))}
        </ul>
        {guilds.joined.length > 0 && guilds.suggested.length > 0 && (
          <p className="text-sm text-muted-foreground">
            Also worth a look:{" "}
            {guilds.suggested.map((match, index) => (
              <span key={match.subject.slug}>
                {index > 0 && ", "}
                <Link href={`/community/guilds/${match.subject.slug}`} className="underline underline-offset-4">
                  {match.subject.name}
                </Link>
              </span>
            ))}
            .
          </p>
        )}
      </section>

      <section aria-labelledby="group-title" className="space-y-3">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="group-title" className="text-lg font-semibold">
            Group challenges
          </h2>
          <Link href="/community/challenges" className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
            All group challenges
          </Link>
        </div>
        <ul className="grid gap-4 lg:grid-cols-2">
          {overview.groupChallenges.slice(0, 2).map((view) => (
            <li key={view.challenge.key}>
              <GroupChallengeCard view={view} />
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="mentorship-title" className="space-y-3">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="mentorship-title" className="text-lg font-semibold">
            Mentorship
          </h2>
          <Link href="/community/mentorship" className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
            Find a mentor
          </Link>
        </div>
        {overview.mentorships.length > 0 ? (
          <MentorshipList mentorships={overview.mentorships.slice(0, 2)} />
        ) : overview.chain ? (
          <MentorshipChainCard chains={[overview.chain]} />
        ) : (
          <EmptyState
            icon={UsersIcon}
            title="No mentorships yet"
            description="Someone a couple of steps ahead of you is usually more useful than an expert."
            action={
              <Link href="/community/mentorship" className={buttonVariants({ size: "sm" })}>
                <CompassIcon data-icon="inline-start" />
                Find a mentor
                <ArrowRightIcon data-icon="inline-end" />
              </Link>
            }
          />
        )}
      </section>
    </div>
  );
}
