import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CHALLENGE_LEVEL_OPTIONS,
  formatMinutes,
  labelFor,
  LEARNING_FORMAT_OPTIONS,
  MOVEMENT_OPTIONS,
  TIME_OF_DAY_OPTIONS,
} from "@/modules/identity/preferences";
import type { CharacterSheet } from "@/server/services/character.service";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm font-medium text-pretty">{value}</dd>
    </div>
  );
}

export function PreferencesSummary({ preferences }: { preferences: CharacterSheet["preferences"] }) {
  const list = (values: string[]) => (values.length ? values.join(", ") : "Not set");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preferences</CardTitle>
        <CardDescription>
          {preferences.saved ? "How your days should fit your life." : "Using defaults until you set your own."}
        </CardDescription>
        <CardAction>
          <Link href="/character/edit#preferences" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            Edit
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent>
        <dl className="divide-y">
          <Row label="Time per day" value={formatMinutes(preferences.dailyMinutes)} />
          <Row label="Best time" value={labelFor(TIME_OF_DAY_OPTIONS, preferences.preferredTimeOfDay)} />
          <Row label="Challenge" value={labelFor(CHALLENGE_LEVEL_OPTIONS, preferences.challengeLevel)} />
          <Row
            label="Movement"
            value={list(preferences.movementOptions.map((key) => labelFor(MOVEMENT_OPTIONS, key)))}
          />
          <Row
            label="Learning"
            value={list(preferences.learningFormats.map((key) => labelFor(LEARNING_FORMAT_OPTIONS, key)))}
          />
        </dl>
      </CardContent>
    </Card>
  );
}
