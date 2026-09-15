import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/common/page-header";
import { GoalForm } from "@/components/goals/goal-form";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { updateGoalAction } from "@/server/actions/goal.actions";
import { getGoalDetail } from "@/server/services/goal-view.service";

export const metadata: Metadata = { title: "Edit goal" };

export default async function EditGoalPage(props: PageProps<"/goals/[goalId]/edit">) {
  const { goalId } = await props.params;
  const goal = await getGoalDetail(goalId);
  if (!goal) notFound();
  // Archived goals are read-only; send people back to restore first.
  if (goal.archived) redirect(`/goals/${goal.id}`);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href={`/goals/${goal.id}`} className={buttonVariants({ variant: "ghost", size: "sm", className: "-ml-2" })}>
        <ArrowLeftIcon data-icon="inline-start" />
        Back to goal
      </Link>
      <PageHeader eyebrow="Edit goal" title={goal.title} />
      <Card>
        <CardContent className="py-2">
          <GoalForm
            mode="edit"
            action={updateGoalAction.bind(null, goal.id)}
            cancelHref={`/goals/${goal.id}`}
            initial={{
              title: goal.title,
              lifeArea: goal.lifeArea,
              motivation: goal.motivation ?? "",
              target: goal.target ?? "",
              description: goal.description ?? "",
              startingPoint: goal.startingPoint,
              deadline: goal.deadline ?? "",
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
