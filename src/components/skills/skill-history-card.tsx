import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { SkillHistoryEntry } from "@/server/services/skill.service";

const dateFormat = new Intl.DateTimeFormat("en", { month: "short", day: "numeric" });

/** The auditable skill progression history — where every point came from. */
export function SkillHistoryCard({ entries, scoped = false }: { entries: SkillHistoryEntry[]; scoped?: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Skill history</CardTitle>
        <CardDescription>
          {scoped ? "Progress in this tree, action by action." : "Every point of skill progress, and the real action behind it."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing yet — skill progress comes from completed quests, so today&apos;s quests are the way in.
          </p>
        ) : (
          <ol className="divide-y">
            {entries.map((entry) => (
              <li key={entry.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                <span className="text-lg" aria-hidden>
                  {entry.tree.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">
                    <span className="font-medium">{entry.skill.name}</span>
                    <span className="text-muted-foreground"> — {entry.reason}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{entry.tree.name}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-medium text-emerald-600 tabular-nums dark:text-emerald-300">+{entry.amount}</p>
                  <p className="text-xs text-muted-foreground">{dateFormat.format(new Date(entry.createdAt))}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
