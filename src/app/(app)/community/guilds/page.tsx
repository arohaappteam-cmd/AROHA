import type { Metadata } from "next";
import { connection } from "next/server";

import { PageHeader } from "@/components/common/page-header";
import { CommunityTabs, DemoNotice } from "@/components/social/community-chrome";
import { GuildCard } from "@/components/social/guild-cards";
import { getCurrentUser } from "@/server/auth/current-user";
import { getGuilds } from "@/server/services/social.service";

export const metadata: Metadata = { title: "Guilds" };

export default async function GuildsPage() {
  await connection();
  const user = await getCurrentUser();
  const guilds = await getGuilds(user);
  const suggested = new Map(guilds.suggested.map((match) => [match.subject.slug, match.reasons]));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Community"
        title="Guilds"
        description="A guild is a small group around one kind of practice, with a weekly ritual and a few plain rules about how people treat each other."
      />
      <CommunityTabs active="/community/guilds" />
      <DemoNotice kind="seeded" />

      {guilds.joined.length > 0 && (
        <section aria-labelledby="joined-title" className="space-y-3">
          <h2 id="joined-title" className="text-lg font-semibold">
            Your guilds
          </h2>
          <ul className="grid gap-4 md:grid-cols-2">
            {guilds.joined.map((card) => (
              <li key={card.guild.slug}>
                <GuildCard guild={card.guild} joined />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="all-title" className="space-y-3">
        <h2 id="all-title" className="text-lg font-semibold">
          {guilds.joined.length > 0 ? "Other guilds" : "All guilds"}
        </h2>
        <ul className="grid gap-4 md:grid-cols-2">
          {guilds.all
            .filter((card) => !card.joined)
            .map((card) => (
              <li key={card.guild.slug}>
                <GuildCard guild={card.guild} joined={false} reasons={suggested.get(card.guild.slug) ?? card.reasons} />
              </li>
            ))}
        </ul>
      </section>
    </div>
  );
}
