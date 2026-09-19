import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";

import { PageHeader } from "@/components/common/page-header";
import { CommunityTabs, DemoNotice } from "@/components/social/community-chrome";
import { GroupChallengeCard } from "@/components/social/group-challenge-card";
import { getCurrentUser } from "@/server/auth/current-user";
import { getGroupChallenges } from "@/server/services/social.service";

export const metadata: Metadata = { title: "Group challenges" };

export default async function GroupChallengesPage() {
  await connection();
  const user = await getCurrentUser();
  const views = await getGroupChallenges(user);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Community"
        title="Group challenges"
        description="The same commitment, attempted alongside other people. Joining one starts your own challenge — days are earned by completing matching quests, exactly as they would be alone."
      />
      <CommunityTabs active="/community/challenges" />
      <DemoNotice kind="seeded" />

      <p className="text-sm text-muted-foreground">
        Two challenges at a time is still the limit, group or not. Yours live on{" "}
        <Link href="/journey" className="underline underline-offset-4">
          Journey
        </Link>{" "}
        with everything else.
      </p>

      <ul className="grid gap-4 lg:grid-cols-2">
        {views.map((view) => (
          <li key={view.challenge.key}>
            <GroupChallengeCard view={view} />
          </li>
        ))}
      </ul>
    </div>
  );
}
