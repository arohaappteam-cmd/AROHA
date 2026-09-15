import { CrosshairIcon } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/common/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MAX_FOCUS_AREAS } from "@/modules/identity/life-areas";
import type { CharacterSheet } from "@/server/services/character.service";

export function FocusAreasCard({ focus }: { focus: CharacterSheet["focus"] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Current focus</CardTitle>
        <CardDescription>Where you&apos;re putting your energy right now.</CardDescription>
        <CardAction>
          <Link href="/character/edit#life-areas" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            Edit
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent>
        {focus.length === 0 ? (
          <EmptyState
            icon={CrosshairIcon}
            title="No focus chosen yet"
            description={`Pick up to ${MAX_FOCUS_AREAS} life areas to prioritise. You can change them whenever life changes.`}
            action={
              <Link href="/character/edit#life-areas" className={buttonVariants({ size: "sm" })}>
                Choose focus areas
              </Link>
            }
          />
        ) : (
          <ol className="space-y-2.5">
            {focus.map((area, index) => (
              <li key={area.key} className="flex gap-3 rounded-lg bg-muted/40 p-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-background text-xl" aria-hidden>
                  {area.emoji}
                </span>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="flex items-center gap-2 font-medium">
                    {area.label}
                    <span className="text-xs font-normal text-muted-foreground tabular-nums">#{index + 1}</span>
                  </p>
                  <p className="text-sm text-pretty text-muted-foreground">
                    {area.intention ?? area.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
