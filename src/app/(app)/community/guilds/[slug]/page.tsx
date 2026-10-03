import { CalendarCheckIcon, ScrollTextIcon, UsersIcon } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { PageHeader } from "@/components/common/page-header";
import { CommunityTabs } from "@/components/social/community-chrome";
import { GroupChallengeCard } from "@/components/social/group-challenge-card";
import { GuildMembershipButton } from "@/components/social/membership-buttons";
import { PersonRow } from "@/components/social/person-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LIFE_AREAS } from "@/modules/identity/life-areas";
import { getCurrentUser } from "@/server/auth/current-user";
import { getGuildDetail } from "@/server/services/social.service";

export async function generateMetadata(props: PageProps<"/community/guilds/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const user = await getCurrentUser();
  const detail = await getGuildDetail(user, slug);
  return { title: detail?.guild.name ?? "Guild" };
}

export default async function GuildPage(props: PageProps<"/community/guilds/[slug]">) {
  await connection();
  const { slug } = await props.params;
  const user = await getCurrentUser();
  const detail = await getGuildDetail(user, slug);
  if (!detail) notFound();

  const { guild } = detail;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`${LIFE_AREAS[guild.lifeArea].label} guild`}
        title={guild.name}
        description={guild.description}
        actions={<GuildMembershipButton slug={guild.slug} joined={detail.joined} size="default" />}
      />
      <CommunityTabs active="/community/guilds" />

      {detail.shared.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Matches your interest in {detail.shared.slice(0, 4).join(", ")}.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarCheckIcon className="size-4 text-primary" aria-hidden />
              {guild.ritual.title}
            </CardTitle>
            <CardDescription>The guild&apos;s weekly ritual — the one thing members actually do together.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-pretty">{guild.ritual.detail}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ScrollTextIcon className="size-4 text-muted-foreground" aria-hidden />
              How it works here
            </CardTitle>
            <CardDescription>Guild norms, stated plainly.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {guild.norms.map((norm) => (
                <li key={norm} className="flex gap-2 text-sm text-pretty">
                  <span aria-hidden className="text-muted-foreground">
                    ·
                  </span>
                  {norm}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {detail.challenges.length > 0 && (
        <section aria-labelledby="guild-challenges" className="space-y-3">
          <h2 id="guild-challenges" className="text-lg font-semibold">
            Group challenges
          </h2>
          <ul className="grid gap-4 lg:grid-cols-2">
            {detail.challenges.map((view) => (
              <li key={view.challenge.key}>
                <GroupChallengeCard view={view} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UsersIcon className="size-4 text-muted-foreground" aria-hidden />
            Members
          </CardTitle>
          <CardDescription>
            {guild.memberCount.toLocaleString("en")} {guild.memberCount === 1 ? "member" : "members"}. Those with a visible profile are
            listed; mentors are marked — they&apos;ve said they&apos;re open to helping.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {detail.members.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {detail.joined ? "No other member here has a visible profile yet." : "No visible members yet — be one of the first."}
            </p>
          )}
          <ul className="divide-y">
            {detail.members.map((person) => (
              <PersonRow
                key={person.handle}
                person={person}
                trailing={detail.mentors.some((mentor) => mentor.handle === person.handle) ? <Badge variant="outline">Mentor</Badge> : null}
              />
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
