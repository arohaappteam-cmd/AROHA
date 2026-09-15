import { MapIcon, ScrollTextIcon, TrophyIcon, WrenchIcon, type LucideIcon } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { CharacterSheet } from "@/server/services/character.service";

type RecordItem = {
  icon: LucideIcon;
  label: string;
  value: number;
  empty: string;
};

/**
 * Real counts from the database. They read zero until the systems that
 * produce them (goals, quests, skills, achievements) are built.
 */
export function ProgressionRecord({ record }: { record: CharacterSheet["record"] }) {
  const items: RecordItem[] = [
    { icon: MapIcon, label: "Active goals", value: record.activeGoals, empty: "Set a goal to start your roadmap" },
    { icon: ScrollTextIcon, label: "Quests completed", value: record.questsCompleted, empty: "Earned by completing daily quests" },
    { icon: WrenchIcon, label: "Skills unlocked", value: record.skills, empty: "Unlocked through practice and proof" },
    { icon: TrophyIcon, label: "Achievements", value: record.achievements, empty: "Meaningful milestones you reach" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Progression record</CardTitle>
        <CardDescription>What you have become through your actions.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {items.map(({ icon: Icon, label, value, empty }) => (
            <li key={label} className="flex items-start gap-3 rounded-lg bg-muted/40 p-3">
              <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-background text-muted-foreground">
                <Icon className="size-4" aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="text-2xl leading-none font-semibold tabular-nums">{value}</p>
                <p className="mt-1 text-sm">{label}</p>
                {value === 0 && <p className="text-xs text-muted-foreground">{empty}</p>}
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
