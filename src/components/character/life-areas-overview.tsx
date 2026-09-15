import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { CharacterSheet } from "@/server/services/character.service";

const numberFormat = new Intl.NumberFormat("en");

export function LifeAreasOverview({ areas }: { areas: CharacterSheet["lifeAreas"] }) {
  const activeCount = areas.filter((area) => area.isActive).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Life areas</CardTitle>
        <CardDescription>
          {activeCount} of {areas.length} active. XP in each area comes from real completed actions.
        </CardDescription>
        <CardAction>
          <Link href="/character/edit#life-areas" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            Edit
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {areas.map((area) => (
            <li
              key={area.key}
              title={area.description}
              className={cn(
                "relative flex flex-col gap-2 rounded-lg border p-3 transition-colors",
                area.isFocus && "border-primary/50 bg-primary/5",
                !area.isActive && "border-dashed opacity-55",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xl" aria-hidden>
                  {area.emoji}
                </span>
                {area.isFocus ? (
                  <span className="rounded-full bg-primary/15 px-1.5 py-px text-[10px] font-medium tracking-wide text-primary uppercase">
                    Focus
                  </span>
                ) : area.core ? (
                  <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">Core</span>
                ) : null}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{area.label}</p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {area.isActive ? `${numberFormat.format(area.xp)} XP` : "Not active"}
                </p>
              </div>
              <span className="sr-only">
                {area.isFocus ? "Current focus." : area.isActive ? "Active." : "Inactive."}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
