import { LightbulbIcon } from "lucide-react";

import type { LearningExperience } from "@/modules/quests/learning";

export function LessonView({ lesson }: { lesson: LearningExperience }) {
  return (
    <article aria-labelledby="lesson-title" className="space-y-5">
      <header className="space-y-1">
        <p className="text-[11px] font-semibold tracking-[0.18em] text-amber-600 uppercase dark:text-amber-300">
          Micro-lesson · {lesson.minutes} min read
        </p>
        <h2 id="lesson-title" className="text-xl font-semibold text-balance">
          {lesson.title}
        </h2>
        <p className="text-sm text-muted-foreground">{lesson.hook}</p>
      </header>

      <div className="space-y-4">
        {lesson.sections.map((section) => (
          <section key={section.heading} className="space-y-1.5">
            <h3 className="font-medium">{section.heading}</h3>
            <p className="text-sm leading-relaxed text-pretty text-foreground/85">{section.body}</p>
          </section>
        ))}
      </div>

      <div className="flex gap-3 rounded-xl border bg-muted/40 p-4">
        <LightbulbIcon className="mt-0.5 size-5 shrink-0 text-amber-500" aria-hidden />
        <div className="space-y-0.5">
          <p className="text-xs font-medium tracking-wide text-amber-600 uppercase dark:text-amber-300">Key idea</p>
          <p className="text-sm text-pretty">{lesson.keyIdea}</p>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {lesson.provider === "mentor"
          ? "Written for you by the AI Mentor, based on your interests."
          : "From AROHA's curated lesson library."}
      </p>
    </article>
  );
}
