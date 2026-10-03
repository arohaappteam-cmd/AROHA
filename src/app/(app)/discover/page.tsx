import type { Metadata } from "next";
import { connection } from "next/server";

import { PageHeader } from "@/components/common/page-header";
import { ExperimentCard } from "@/components/experiments/experiment-card";
import { CustomExperimentForm, ExperimentTemplates } from "@/components/experiments/start-experiment";
import { getCurrentUser } from "@/server/auth/current-user";
import { getExperimentsOverview } from "@/server/services/experiment.service";

export const metadata: Metadata = { title: "Discover" };

export default async function DiscoverPage() {
  await connection();
  const user = await getCurrentUser();
  const overview = await getExperimentsOverview(user);

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Discover · Experiment Mode"
        title="Try something, without committing"
        description="Pick something you're curious about and try it for a few days. A short practice quest joins your day, and at the end you decide: keep going, explore more, or not for now."
      />

      {overview.reviewDue.length > 0 && (
        <section aria-labelledby="review-title" className="space-y-3">
          <h2 id="review-title" className="text-lg font-semibold">
            Ready for your review
          </h2>
          <ul className="grid gap-3 md:grid-cols-2">
            {overview.reviewDue.map((experiment) => (
              <li key={experiment.id}>
                <ExperimentCard experiment={experiment} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="running-title" className="space-y-3">
        <h2 id="running-title" className="text-lg font-semibold">
          Running now
        </h2>
        {overview.active.length === 0 ? (
          <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
            No experiments running. Pick one below — the first practice quest appears on today&apos;s path straight away.
          </p>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {overview.active.map((experiment) => (
              <li key={experiment.id}>
                <ExperimentCard experiment={experiment} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="ideas-title" className="space-y-4">
        <div>
          <h2 id="ideas-title" className="text-lg font-semibold">
            Experiments to try
          </h2>
          <p className="text-sm text-muted-foreground">Practice builds the related skill tree, so a good experiment gives you a head start.</p>
        </div>
        <ExperimentTemplates templates={overview.templates} canStart={overview.canStart} planLimit={overview.planLimit} />
        <CustomExperimentForm canStart={overview.canStart} />
      </section>

      {overview.past.length > 0 && (
        <section aria-labelledby="past-title" className="space-y-3">
          <h2 id="past-title" className="text-lg font-semibold">
            Past experiments
          </h2>
          <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {overview.past.map((experiment) => (
              <li key={experiment.id}>
                <ExperimentCard experiment={experiment} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
