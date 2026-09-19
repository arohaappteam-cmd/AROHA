import { EyeIcon, LockKeyholeIcon } from "lucide-react";
import type { Metadata } from "next";
import { connection } from "next/server";

import { CharacterAvatar } from "@/components/character/character-avatar";
import { PageHeader } from "@/components/common/page-header";
import { CommunityTabs } from "@/components/social/community-chrome";
import { SharingForm } from "@/components/social/sharing-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LIFE_AREAS } from "@/modules/identity/life-areas";
import { getCurrentUser } from "@/server/auth/current-user";
import { getSocialProfile } from "@/server/services/social.service";

export const metadata: Metadata = { title: "Your sharing" };

export default async function SocialProfilePage() {
  await connection();
  const user = await getCurrentUser();
  const { viewer, stats, guilds } = await getSocialProfile(user);
  const { settings } = viewer;
  const isPrivate = settings.visibility === "PRIVATE";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Community"
        title="What you share"
        description="Your record is yours. Nothing about you appears in the community until you turn it on here, and you can turn it off again at any time."
      />
      <CommunityTabs active="/community/profile" />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Card>
          <CardHeader>
            <CardTitle>Sharing settings</CardTitle>
            <CardDescription>Your journal, reflections and private notes are never shared, whatever you choose here.</CardDescription>
          </CardHeader>
          <CardContent>
            <SharingForm initial={settings} />
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isPrivate ? <LockKeyholeIcon className="size-4 text-muted-foreground" aria-hidden /> : <EyeIcon className="size-4 text-primary" aria-hidden />}
              {isPrivate ? "Nobody sees this" : "What others would see"}
            </CardTitle>
            <CardDescription>
              {isPrivate
                ? "Your profile is private. This is what a member would see if you made it visible."
                : "Your profile as another member sees it."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <CharacterAvatar appearance={viewer.appearance} name={viewer.name} tier={viewer.tier} size={48} />
              <div className="min-w-0">
                <p className="font-medium">{viewer.name}</p>
                {settings.showLevel ? (
                  <p className="text-xs text-muted-foreground">
                    Level {viewer.level} · {viewer.tier}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">Level hidden</p>
                )}
              </div>
            </div>

            {settings.headline && <p className="text-sm text-pretty">{settings.headline}</p>}

            {settings.showSkills && viewer.skills.length > 0 && (
              <div>
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Skills</p>
                <ul className="mt-1 space-y-1 text-sm">
                  {viewer.skills.slice(0, 4).map((skill) => (
                    <li key={skill.treeSlug} className="flex items-center justify-between gap-2">
                      <span className="truncate">
                        <span aria-hidden>{skill.emoji}</span> {skill.name}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">Lv {skill.level}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {settings.showAchievements && (
              <p className="text-sm text-muted-foreground">
                {stats.achievements} achievements · {stats.challengesCompleted} challenges finished
              </p>
            )}

            {viewer.focusAreas.length > 0 && (
              <p className="flex flex-wrap gap-1.5">
                {viewer.focusAreas.map((area) => (
                  <Badge key={area} variant="outline">
                    {LIFE_AREAS[area].emoji} {LIFE_AREAS[area].label}
                  </Badge>
                ))}
              </p>
            )}

            {guilds.length > 0 && (
              <p className="text-xs text-muted-foreground">Guilds: {guilds.map((guild) => guild.name).join(", ")}</p>
            )}

            <p className="border-t pt-3 text-xs text-muted-foreground">
              {settings.onLeaderboards ? "Listed on leaderboards." : "Not listed on leaderboards."}{" "}
              {settings.openToMentoring ? "Open to mentoring." : ""} {settings.seekingMentor ? "Looking for a mentor." : ""}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
