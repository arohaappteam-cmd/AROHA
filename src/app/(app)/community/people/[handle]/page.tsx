import { HeartHandshakeIcon, SparklesIcon, TrophyIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { CharacterAvatar } from "@/components/character/character-avatar";
import { PageHeader } from "@/components/common/page-header";
import { CommunityTabs } from "@/components/social/community-chrome";
import { MentorshipRequestToggle } from "@/components/social/mentorship";
import { PersonRow, TierBadge, personLevel, personTier } from "@/components/social/person-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LIFE_AREAS } from "@/modules/identity/life-areas";
import { getCurrentUser } from "@/server/auth/current-user";
import { getPerson } from "@/server/services/social.service";

export async function generateMetadata(props: PageProps<"/community/people/[handle]">): Promise<Metadata> {
  const { handle } = await props.params;
  const user = await getCurrentUser();
  const view = await getPerson(user, handle);
  return { title: view?.person.displayName ?? "Member" };
}

const treeLabel = (slug: string) => slug.replace(/-/g, " ").replace(/^./, (character) => character.toUpperCase());

function tenure(days: number): string {
  if (days < 7) return "new to AROHA";
  if (days < 60) return `${Math.round(days / 7)} weeks in AROHA`;
  return `${Math.round(days / 30)} months in AROHA`;
}

export default async function PersonPage(props: PageProps<"/community/people/[handle]">) {
  await connection();
  const { handle } = await props.params;
  const user = await getCurrentUser();
  const view = await getPerson(user, handle);
  if (!view) notFound();

  const { person, shared } = view;
  const level = personLevel(person);
  const { progress, record } = person;
  const improvement = progress && progress.xpPrevious > 0 ? Math.round(((progress.xpRecent - progress.xpPrevious) / progress.xpPrevious) * 100) : null;
  const firstName = person.displayName.split(" ")[0];

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Community member" title={person.displayName} description={person.headline || undefined} />
      <CommunityTabs active="/community" />

      <Card>
        <CardContent className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <CharacterAvatar appearance={person.avatar} name={person.displayName} tier={personTier(person)} size={96} />
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <TierBadge person={person} />
              {level !== null && <Badge variant="outline">Level {level}</Badge>}
              {person.pronouns && <span className="text-sm text-muted-foreground">{person.pronouns}</span>}
              <span className="text-sm text-muted-foreground">· {tenure(person.joinedDaysAgo)}</span>
            </div>
            {person.about && <p className="text-sm text-pretty">{person.about}</p>}
            {person.note && (
              <p className="rounded-xl border-l-2 border-primary/50 bg-muted/30 px-3 py-2 text-sm text-pretty italic">“{person.note}”</p>
            )}
            {view.guilds.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Guilds:{" "}
                {view.guilds.map((guild, index) => (
                  <span key={guild.slug}>
                    {index > 0 && ", "}
                    <Link href={`/community/guilds/${guild.slug}`} className="underline-offset-4 hover:underline">
                      {guild.name}
                    </Link>
                  </span>
                ))}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {(shared.interests.length > 0 || shared.guilds.length > 0 || shared.focusAreas.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SparklesIcon className="size-4 text-primary" aria-hidden />
              What you have in common
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {shared.interests.length > 0 && <p>Interests: {shared.interests.join(", ")}</p>}
            {shared.guilds.length > 0 && <p>Guilds: {shared.guilds.map((guild) => guild.name).join(", ")}</p>}
            {shared.focusAreas.length > 0 && <p>Focus areas: {shared.focusAreas.map((area) => LIFE_AREAS[area].label).join(", ")}</p>}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Their progress</CardTitle>
            <CardDescription>
              {progress || record
                ? "The last 28 days, against their own 28 days before that — the same measure you see for yourself."
                : `${firstName} keeps their progress private.`}
            </CardDescription>
          </CardHeader>
          {(progress || record) && (
            <CardContent>
              <dl className="grid grid-cols-2 gap-3">
                {progress && (
                  <>
                    <div className="rounded-xl border p-3">
                      <dt className="text-xs text-muted-foreground">XP in 28 days</dt>
                      <dd className="text-xl font-semibold">{progress.xpRecent.toLocaleString("en")}</dd>
                      <dd className="text-xs text-muted-foreground">
                        {improvement === null ? "No earlier period to compare" : `${improvement > 0 ? "+" : ""}${improvement}% vs their previous 28 days`}
                      </dd>
                    </div>
                    <div className="rounded-xl border p-3">
                      <dt className="text-xs text-muted-foreground">Quests completed</dt>
                      <dd className="text-xl font-semibold">{progress.questsRecent}</dd>
                      <dd className="text-xs text-muted-foreground">in the last 28 days</dd>
                    </div>
                  </>
                )}
                {record && (
                  <>
                    <div className="rounded-xl border p-3">
                      <dt className="text-xs text-muted-foreground">Achievements</dt>
                      <dd className="text-xl font-semibold">{record.achievements}</dd>
                    </div>
                    <div className="rounded-xl border p-3">
                      <dt className="text-xs text-muted-foreground">Challenges finished</dt>
                      <dd className="text-xl font-semibold">{record.challengesCompleted}</dd>
                    </div>
                  </>
                )}
              </dl>
            </CardContent>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrophyIcon className="size-4 text-muted-foreground" aria-hidden />
              Skills and interests
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {person.skills.length > 0 ? (
              <ul className="space-y-2">
                {person.skills.map((skill) => (
                  <li key={skill.treeSlug} className="space-y-1">
                    <p className="flex items-center justify-between gap-3 text-sm">
                      <span className="truncate">{skill.label}</span>
                      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                        Lv {skill.level}/{skill.maxLevel}
                      </span>
                    </p>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-success" style={{ width: `${(skill.level / skill.maxLevel) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No skills shared.</p>
            )}
            {person.interests.length > 0 && <p className="text-xs text-muted-foreground">Interests: {person.interests.join(", ")}</p>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HeartHandshakeIcon className="size-4 text-primary" aria-hidden />
            Mentorship
          </CardTitle>
          <CardDescription>
            {person.openToMentoring && person.mentorsIn.length > 0
              ? `${person.displayName} is open to mentoring in ${person.mentorsIn.map(treeLabel).join(", ")}.`
              : person.seekingMentorIn.length > 0
                ? `${person.displayName} is looking for a mentor.`
                : `${person.displayName} isn't taking on anyone right now.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(view.mentoredBy.length > 0 || view.mentoring.length > 0) && (
            <div className="grid gap-4 sm:grid-cols-2">
              {view.mentoredBy.length > 0 && (
                <div>
                  <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Mentored by</p>
                  <ul className="divide-y">
                    {view.mentoredBy.map((mentor) => (
                      <PersonRow key={mentor.handle} person={mentor} />
                    ))}
                  </ul>
                </div>
              )}
              {view.mentoring.length > 0 && (
                <div>
                  <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Mentoring</p>
                  <ul className="divide-y">
                    {view.mentoring.map((mentee) => (
                      <PersonRow key={mentee.handle} person={mentee} />
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {view.mentorship ? (
            <p className="text-sm">
              {view.mentorship.status === "PENDING"
                ? `There's a mentorship request open between you and ${firstName}.`
                : `You have an active mentorship with ${firstName} about ${view.mentorship.topic}.`}{" "}
              <Link href="/community/mentorship" className="underline underline-offset-4">
                Open mentorship
              </Link>
            </p>
          ) : person.openToMentoring && person.mentorsIn.length > 0 ? (
            <MentorshipRequestToggle
              handle={person.handle}
              name={person.displayName}
              role="MENTEE"
              topics={person.mentorsIn.map(treeLabel)}
              label={`Ask ${firstName} for mentorship`}
            />
          ) : person.seekingMentorIn.length > 0 && view.viewer.canMentorIn.some((tree) => person.seekingMentorIn.includes(tree)) ? (
            <MentorshipRequestToggle
              handle={person.handle}
              name={person.displayName}
              role="MENTOR"
              topics={person.seekingMentorIn.filter((tree) => view.viewer.canMentorIn.includes(tree)).map(treeLabel)}
              label={`Offer to help ${firstName}`}
            />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
