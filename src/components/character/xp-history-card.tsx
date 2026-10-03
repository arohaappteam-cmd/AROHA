import { SparklesIcon } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ATTRIBUTES } from "@/modules/progression/attributes";
import { LIFE_AREAS } from "@/modules/identity/life-areas";
import type { XpEntry } from "@/server/services/character.service";
import { Glyph } from "@/components/common/glyph";

const timeFormat = new Intl.DateTimeFormat("en", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

function attributeLabel(key: string) {
  return ATTRIBUTES.find((a) => a.key === key);
}

/**
 * The XP ledger, newest first. Every point of progression traces back to a
 * real action here — nothing is a stored, unexplained total.
 */
export function XpHistoryCard({ entries }: { entries: XpEntry[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent XP</CardTitle>
        <CardDescription>Every point comes from something you actually did.</CardDescription>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <EmptyState
            icon={SparklesIcon}
            title="No XP yet"
            description="Complete a quest on today's journey and it'll show up here."
          />
        ) : (
          <ul className="divide-y">
            {entries.map((entry) => {
              const area = entry.lifeArea ? LIFE_AREAS[entry.lifeArea] : null;
              return (
                <li key={entry.id} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span aria-hidden className="mt-0.5 text-lg">
                    <Glyph emoji={area?.emoji ?? "✨"} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{entry.reason}</p>
                    <p className="text-xs text-muted-foreground">
                      {timeFormat.format(entry.createdAt)}
                      {entry.attributes.length > 0 && (
                        <>
                          {" · "}
                          {entry.attributes
                            .map((a) => `${attributeLabel(a.attribute)?.label ?? a.attribute} +${a.amount}`)
                            .join(", ")}
                        </>
                      )}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-xp tabular-nums">+{entry.amount}</span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
