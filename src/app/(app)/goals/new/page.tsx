import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";

import { PageHeader } from "@/components/common/page-header";
import { GoalForm } from "@/components/goals/goal-form";
import { UpgradeNotice } from "@/components/plans/upgrade-notice";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createGoalAction } from "@/server/actions/goal.actions";
import { getCurrentUser } from "@/server/auth/current-user";
import { getCharacterSheet } from "@/server/services/character.service";
import { goalLimitMessage } from "@/server/services/goal.service";

export const metadata: Metadata = { title: "New goal" };

export default async function NewGoalPage() {
  await connection();
  const user = await getCurrentUser();
  const [sheet, limit] = await Promise.all([getCharacterSheet(), goalLimitMessage(user.id)]);
  const focus = sheet.focus.map((area) => area.key);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/goals" className={buttonVariants({ variant: "ghost", size: "sm", className: "-ml-2" })}>
        <ArrowLeftIcon data-icon="inline-start" />
        Goals
      </Link>
      <PageHeader
        eyebrow="New goal"
        title="Set a goal worth pursuing"
        description="Any area of life. Start with what you want and why — the plan comes next."
      />
      {limit && <UpgradeNotice message={limit} />}
      <Card>
        <CardContent className="py-2">
          <GoalForm
            mode="create"
            action={createGoalAction}
            cancelHref="/goals"
            suggestedAreas={focus}
            initial={{
              title: "",
              lifeArea: focus[0] ?? "",
              motivation: "",
              target: "",
              description: "",
              startingPoint: "NEW",
              deadline: "",
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
