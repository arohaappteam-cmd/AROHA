import { z } from "zod";

import type { ChallengeLevel, LifeArea, StartingPoint } from "@/generated/prisma/enums";

/**
 * The roadmap contract shared by every generator — the rule-based templates
 * today and the AI Mentor later (via `generateStructured` with this schema).
 * The backend validates a draft with this schema before persisting anything.
 */
export const MAX_MILESTONES = 12;
export const MAX_MISSIONS_PER_MILESTONE = 12;

const title = z.string().trim().min(2).max(120);
const description = z.string().trim().max(500).nullable().default(null);

export const roadmapMissionDraftSchema = z.object({ title, description });

export const roadmapMilestoneDraftSchema = z.object({
  title,
  description,
  missions: z.array(roadmapMissionDraftSchema).max(MAX_MISSIONS_PER_MILESTONE),
});

export const roadmapDraftSchema = z.object({
  /** One-line explanation of how the roadmap was shaped, shown to the user. */
  summary: z.string().trim().max(280).nullable().default(null),
  milestones: z.array(roadmapMilestoneDraftSchema).min(1).max(MAX_MILESTONES),
});

export type RoadmapDraft = z.infer<typeof roadmapDraftSchema>;
export type RoadmapDraftInput = z.input<typeof roadmapDraftSchema>;

/** Everything a generator may use to personalise a roadmap. */
export type RoadmapContext = {
  title: string;
  description: string | null;
  lifeArea: LifeArea;
  motivation: string | null;
  target: string | null;
  startingPoint: StartingPoint;
  challengeLevel: ChallengeLevel;
  interests: string[];
};

export type GeneratedRoadmap = {
  draft: RoadmapDraft;
  /** Stable identifier recorded on the RoadmapRevision. */
  generator: string;
};

export interface RoadmapGenerator {
  readonly name: string;
  generate(context: RoadmapContext): Promise<GeneratedRoadmap>;
}
