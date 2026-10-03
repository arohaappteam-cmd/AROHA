import { ChartLineIcon, CompassIcon, GitBranchIcon, MessageCircleIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/common/page-header";
import { PlanBadge } from "@/components/plans/plan-badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Mentor — coming soon" };

const PREVIEW = [
  { title: "Reads your whole record", detail: "Goals, quests, skills and reflections — so its guidance starts from where you actually are." },
  { title: "Suggests the next step", detail: "One concrete thing to do next, sized for the energy you have this week." },
  { title: "Points out skill gaps", detail: "What's standing between you and the goals you've set, in plain language." },
];

/**
 * The AI Mentor is switched off for launch. The route stays so old links
 * land somewhere honest; the nav shows it with a "Soon" badge.
 */
export default function MentorPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="AI Mentor"
        title="Your mentor is on the way"
        description="A guide that reads your progress and helps you decide what's next. It arrives with Premium and isn't switched on yet — everything else in AROHA works without it."
      />

      <Card>
        <CardContent className="space-y-5">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-muted">
              <MessageCircleIcon className="size-5" aria-hidden />
            </span>
            <PlanBadge tier="PREMIUM" label="Premium · coming soon" />
          </div>
          <ul className="grid gap-4 sm:grid-cols-3">
            {PREVIEW.map((item) => (
              <li key={item.title} className="space-y-1">
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-sm text-pretty text-muted-foreground">{item.detail}</p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">In the meantime:</p>
        <div className="flex flex-wrap gap-2">
          <Link href="/journey" className={buttonVariants({ variant: "outline", size: "sm" })}>
            <ChartLineIcon data-icon="inline-start" />
            See your progress
          </Link>
          <Link href="/skills" className={buttonVariants({ variant: "outline", size: "sm" })}>
            <GitBranchIcon data-icon="inline-start" />
            Practise a skill
          </Link>
          <Link href="/discover" className={buttonVariants({ variant: "outline", size: "sm" })}>
            <CompassIcon data-icon="inline-start" />
            Try an experiment
          </Link>
        </div>
      </div>
    </div>
  );
}
