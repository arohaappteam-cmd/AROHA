import { ExternalLinkIcon } from "lucide-react";
import Link from "next/link";

import { EVIDENCE_KINDS } from "@/components/projects/evidence-kinds";
import { EvaluatorBadge } from "@/components/proof/proof-badges";
import { cn } from "@/lib/utils";
import { ASSESSMENT_KIND_LABEL } from "@/modules/assessments/grading";
import type { SkillPassport } from "@/server/services/passport.service";

const dateFormat = new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" });
const shortDate = new Intl.DateTimeFormat("en", { day: "numeric", month: "short" });

export function SectionHeading({ id, title, description, action }: { id: string; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-2">
      <div>
        <h2 id={id} className="text-lg font-semibold">
          {title}
        </h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">{children}</p>;
}

/** Evidence, not claims: every item links to something that exists. */
export function ProofWall({ proof }: { proof: SkillPassport["proof"] }) {
  if (proof.length === 0) {
    return (
      <Empty>
        No evidence yet. Add links, code, documents or recordings to a{" "}
        <Link href="/projects" className="text-primary hover:underline">
          project
        </Link>{" "}
        — or hand some in with a practical task.
      </Empty>
    );
  }
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {proof.map((item) => {
        const Icon = EVIDENCE_KINDS[item.kind].icon;
        return (
          <li key={item.id} className="flex flex-col gap-2 rounded-2xl border bg-card p-4">
            <div className="flex items-start gap-3">
              <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-500/12 text-emerald-600 dark:text-emerald-300">
                <Icon className="size-4" aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium">{item.title}</p>
                <Link href={item.source.href} className="block truncate text-xs text-muted-foreground hover:underline">
                  {item.source.type === "project" ? "Project" : "Assessment"} · {item.source.title}
                </Link>
              </div>
            </div>
            {item.note && <p className="line-clamp-3 text-xs whitespace-pre-line text-muted-foreground">{item.note}</p>}
            <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
              {item.skills.map((skill) => (
                <span key={skill} className="rounded-full border px-2 py-0.5 text-[11px]">
                  {skill}
                </span>
              ))}
              {item.url && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  Open
                  <ExternalLinkIcon className="size-3" aria-hidden />
                </a>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function ProjectsGallery({ projects }: { projects: SkillPassport["projects"] }) {
  if (projects.length === 0) {
    return (
      <Empty>
        No projects yet.{" "}
        <Link href="/projects/new" className="text-primary hover:underline">
          Start one
        </Link>{" "}
        — finished projects with evidence are the strongest proof you can have.
      </Empty>
    );
  }
  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {projects.map((project) => {
        const completed = project.status === "COMPLETED";
        return (
          <li key={project.id}>
            <Link
              href={`/projects/${project.id}`}
              className={cn(
                "flex h-full flex-col gap-2 rounded-2xl border bg-card p-4 transition-colors hover:border-primary/50",
                !completed && "border-dashed",
              )}
            >
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>
                  <span aria-hidden>{project.category.emoji}</span> {project.category.label}
                </span>
                <span className={completed ? "font-medium text-emerald-600 dark:text-emerald-300" : ""}>
                  {completed && project.completedAt ? `Shipped ${dateFormat.format(project.completedAt)}` : "In the making"}
                </span>
              </div>
              <p className="text-base font-semibold">{project.title}</p>
              {project.reflection ? (
                <p className="line-clamp-2 text-sm text-muted-foreground italic">&ldquo;{project.reflection}&rdquo;</p>
              ) : (
                project.description && <p className="line-clamp-2 text-sm text-muted-foreground">{project.description}</p>
              )}
              <div className="mt-auto flex flex-wrap gap-1 pt-1">
                {project.skills.map((skill) => (
                  <span key={skill} className="rounded-full bg-muted px-2 py-0.5 text-[11px]">
                    {skill}
                  </span>
                ))}
              </div>
              <p className="text-xs text-muted-foreground tabular-nums">
                {project.evidenceCount} evidence
                {project.milestones.total > 0 && ` · ${project.milestones.done}/${project.milestones.total} milestones`}
              </p>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function AssessmentRecord({ assessments }: { assessments: SkillPassport["assessments"] }) {
  if (assessments.length === 0) {
    return (
      <Empty>
        Nothing passed yet.{" "}
        <Link href="/assessments" className="text-primary hover:underline">
          Take an assessment
        </Link>
        .
      </Empty>
    );
  }
  return (
    <ul className="divide-y rounded-2xl border bg-card">
      {assessments.map((assessment) => (
        <li key={assessment.id}>
          <Link href={`/assessments/attempts/${assessment.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30">
            <div
              className={cn(
                "grid size-11 shrink-0 place-items-center rounded-full border-2 text-xs font-semibold tabular-nums",
                assessment.kind === "QUIZ" ? "border-violet-500/60" : "border-emerald-500/70",
              )}
            >
              {assessment.percent}%
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{assessment.title}</p>
              <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                {ASSESSMENT_KIND_LABEL[assessment.kind]} · {assessment.skill} · {shortDate.format(assessment.date)}
                <EvaluatorBadge evaluator={assessment.evaluator} />
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function MilestoneTimeline({ milestones }: { milestones: SkillPassport["milestones"] }) {
  if (milestones.length === 0) {
    return <Empty>Milestones appear here as goals, projects, assessments and challenges are completed.</Empty>;
  }
  return (
    <ol className="relative space-y-4 border-l pl-6">
      {milestones.map((milestone) => {
        const content = (
          <>
            <p className="text-sm font-medium">{milestone.title}</p>
            <p className="text-xs text-muted-foreground">
              {milestone.detail} · {dateFormat.format(milestone.date)}
            </p>
          </>
        );
        return (
          <li key={milestone.id} className="relative">
            <span
              className="absolute top-0 -left-[37px] grid size-7 place-items-center rounded-full border bg-card text-sm"
              aria-hidden
            >
              {milestone.emoji}
            </span>
            {milestone.href ? (
              <Link href={milestone.href} className="block rounded-lg hover:underline">
                {content}
              </Link>
            ) : (
              content
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function AchievementStrip({ achievements }: { achievements: SkillPassport["achievements"] }) {
  if (achievements.length === 0) {
    return (
      <Empty>
        No achievements yet — they unlock automatically.{" "}
        <Link href="/journey#achievements" className="text-primary hover:underline">
          See what&apos;s possible
        </Link>
        .
      </Empty>
    );
  }
  return (
    <ul className="flex flex-wrap gap-2">
      {achievements.map((achievement) => (
        <li
          key={achievement.slug}
          title={`${achievement.description} · ${dateFormat.format(achievement.unlockedAt)}`}
          className="flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/8 py-1.5 pr-3.5 pl-1.5"
        >
          <span className="grid size-7 place-items-center rounded-full bg-card text-base" aria-hidden>
            {achievement.emoji}
          </span>
          <span className="text-sm font-medium">{achievement.name}</span>
        </li>
      ))}
    </ul>
  );
}

export function ChallengesAndExperiences({
  challenges,
  experiences,
}: {
  challenges: SkillPassport["challenges"];
  experiences: SkillPassport["experiences"];
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Challenges completed</h3>
        {challenges.length === 0 ? (
          <Empty>
            None yet.{" "}
            <Link href="/journey/challenges" className="text-primary hover:underline">
              Take on a challenge
            </Link>
            .
          </Empty>
        ) : (
          <ul className="space-y-2">
            {challenges.map((challenge) => (
              <li key={challenge.id} className="flex items-center gap-3 rounded-xl border bg-card px-3 py-2.5">
                <span className="text-xl" aria-hidden>
                  {challenge.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{challenge.title}</p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {challenge.days} days of real action{challenge.completedAt && ` · ${dateFormat.format(challenge.completedAt)}`}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Experiences</h3>
        {experiences.length === 0 ? (
          <Empty>New places and new things tried show up here, from completed exploration quests.</Empty>
        ) : (
          <ul className="space-y-2">
            {experiences.map((experience) => (
              <li key={experience.id} className="rounded-xl border bg-card px-3 py-2.5">
                <p className="text-sm font-medium">🌎 {experience.title}</p>
                {experience.note && <p className="line-clamp-2 text-xs text-muted-foreground">{experience.note}</p>}
                <p className="text-xs text-muted-foreground">{dateFormat.format(experience.date)}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
