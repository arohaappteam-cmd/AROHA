import { UsersIcon } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LIFE_AREAS } from "@/modules/identity/life-areas";
import type { Guild } from "@/modules/social/types";

import { GuildMembershipButton } from "./membership-buttons";

const numberFormat = new Intl.NumberFormat("en");

export function GuildCard({ guild, joined, reasons }: { guild: Guild; joined: boolean; reasons?: string[] }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span aria-hidden className="text-xl">
            {guild.emoji}
          </span>
          <Link href={`/community/guilds/${guild.slug}`} className="underline-offset-4 hover:underline">
            {guild.name}
          </Link>
          {joined && <Badge variant="secondary">Joined</Badge>}
        </CardTitle>
        <CardDescription>{guild.tagline}</CardDescription>
      </CardHeader>
      <CardContent className="flex h-full flex-col gap-3">
        <p className="text-sm text-pretty text-muted-foreground">{guild.description}</p>

        {reasons && reasons.length > 0 && (
          <ul className="space-y-1">
            {reasons.slice(0, 2).map((reason) => (
              <li key={reason} className="text-xs text-pretty text-muted-foreground">
                <span aria-hidden>· </span>
                {reason}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-1">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <UsersIcon className="size-3.5" aria-hidden />
            {numberFormat.format(guild.memberCount)} members · {LIFE_AREAS[guild.lifeArea].label}
          </p>
          <GuildMembershipButton slug={guild.slug} joined={joined} />
        </div>
      </CardContent>
    </Card>
  );
}
