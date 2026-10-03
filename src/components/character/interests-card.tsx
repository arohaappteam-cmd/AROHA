import { SparkleIcon } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/common/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LIFE_AREAS } from "@/modules/identity/life-areas";
import type { CharacterSheet } from "@/server/services/character.service";
import { Glyph } from "@/components/common/glyph";

export function InterestsCard({ interests }: { interests: CharacterSheet["interests"] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Interests</CardTitle>
        <CardDescription>What makes you curious.</CardDescription>
        <CardAction>
          <Link href="/character/edit#interests" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            Edit
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent>
        {interests.length === 0 ? (
          <EmptyState
            icon={SparkleIcon}
            title="No interests yet"
            description="Add a few things you enjoy or want to explore. AROHA will use them to personalise learning and quests."
          />
        ) : (
          <ul className="flex flex-wrap gap-2">
            {interests.map((interest) => (
              <li
                key={interest.id}
                className="flex items-center gap-1.5 rounded-full border bg-muted/30 px-3 py-1 text-sm"
              >
                {interest.lifeArea && (
                  <span aria-hidden className="text-xs">
                    <Glyph emoji={LIFE_AREAS[interest.lifeArea].emoji} />
                  </span>
                )}
                {interest.label}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
