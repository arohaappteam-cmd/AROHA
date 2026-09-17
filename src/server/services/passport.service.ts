import "server-only";

import type { AssessmentEvaluator, AssessmentKind, EvidenceKind, LifeArea, ProjectCategory } from "@/generated/prisma/enums";
import { ACHIEVEMENTS } from "@/modules/achievements/catalogue";
import type { AvatarAppearance } from "@/modules/identity/avatar";
import { toAppearance } from "@/modules/identity/avatar";
import { getLevelProgress, tierForLevel, type TierTitle } from "@/modules/progression/levels";
import { PROJECT_CATEGORIES } from "@/modules/projects/categories";
import { proofStrength, proofTier, type ProofTier } from "@/modules/proof/tiers";
import { getSkillProgress, skillLevelLabel } from "@/modules/skills/levels";
import { getCurrentUser } from "@/server/auth/current-user";
import { identityRepository } from "@/server/repositories/identity.repository";
import { passportRepository } from "@/server/repositories/passport.repository";
import { progressionRepository } from "@/server/repositories/progression.repository";
import { skillRepository } from "@/server/repositories/skill.repository";
import { ensureAchievementCatalogue } from "@/server/services/achievement.service";
import { ensureSkillCatalogue } from "@/server/services/skill.service";

/**
 * The Skill Passport (spec §21): a living record of capability, assembled on
 * read from what has actually been earned. It separates practice from proof
 * (spec §20) — every skill shows its proof tier and the evidence behind it.
 */

export type PassportSkill = {
  id: string;
  slug: string;
  name: string;
  tree: { slug: string; name: string; emoji: string };
  level: number;
  maxLevel: number;
  levelLabel: string;
  xp: number;
  tier: ProofTier;
  /** Passed assessments for this skill, strongest first. */
  assessments: { title: string; kind: AssessmentKind; evaluator: AssessmentEvaluator; percent: number }[];
  projects: { id: string; title: string }[];
};

export type MasteryArea = {
  slug: string;
  name: string;
  emoji: string;
  lifeArea: LifeArea;
  xp: number;
  skillsActive: number;
  skillsDemonstrated: number;
  skillsMastered: number;
  totalSkills: number;
};

export type ProofItem = {
  id: string;
  title: string;
  url: string | null;
  note: string | null;
  kind: EvidenceKind;
  createdAt: Date;
  source: { type: "project" | "assessment"; title: string; href: string };
  skills: string[];
};

export type PassportMilestone = {
  id: string;
  date: Date;
  kind: "goal" | "goal-milestone" | "project" | "assessment" | "achievement" | "challenge";
  title: string;
  detail: string;
  emoji: string;
  href?: string;
};

export type SkillPassport = {
  identity: {
    displayName: string;
    pronouns: string | null;
    bio: string | null;
    motto: string | null;
    appearance: AvatarAppearance;
    level: number;
    tier: TierTitle;
    totalXp: number;
    memberSince: Date;
  };
  stats: {
    skillsActive: number;
    skillsDemonstrated: number;
    skillsMastered: number;
    projectsCompleted: number;
    assessmentsPassed: number;
    achievements: number;
    challengesCompleted: number;
    proofItems: number;
  };
  masteryAreas: MasteryArea[];
  skills: PassportSkill[];
  projects: {
    id: string;
    title: string;
    description: string | null;
    category: { key: ProjectCategory; label: string; emoji: string };
    status: string;
    completedAt: Date | null;
    reflection: string | null;
    skills: string[];
    milestones: { done: number; total: number };
    evidenceCount: number;
  }[];
  assessments: { id: string; title: string; kind: AssessmentKind; evaluator: AssessmentEvaluator; percent: number; date: Date; skill: string }[];
  achievements: { slug: string; name: string; description: string; emoji: string; unlockedAt: Date }[];
  challenges: { id: string; title: string; emoji: string; days: number; completedAt: Date | null }[];
  experiences: { id: string; title: string; note: string | null; date: Date }[];
  proof: ProofItem[];
  milestones: PassportMilestone[];
};

const EMOJI_BY_ACHIEVEMENT = new Map(ACHIEVEMENTS.map((achievement) => [achievement.slug, achievement.emoji]));

export async function getSkillPassport(): Promise<SkillPassport> {
  const user = await getCurrentUser();
  await Promise.all([ensureSkillCatalogue(), ensureAchievementCatalogue()]);

  const [character, totalXp, xpBySkill, catalogue, attempts, projects, achievements, challenges, experiences, goals, goalMilestones] =
    await Promise.all([
      identityRepository.ensureCharacter(user.id),
      progressionRepository.getTotalXp(user.id),
      skillRepository.xpBySkill(user.id),
      passportRepository.skillsWithTrees(),
      passportRepository.passedAttempts(user.id),
      passportRepository.projects(user.id),
      passportRepository.achievements(user.id),
      passportRepository.completedChallenges(user.id),
      passportRepository.experiences(user.id, 8),
      passportRepository.completedGoals(user.id),
      passportRepository.completedGoalMilestones(user.id, 12),
    ]);

  const completedProjects = projects.filter((project) => project.status === "COMPLETED");

  // ─── Skills and proof tiers ──────────────────────────────────────────────
  const skills: PassportSkill[] = [];
  const strength = new Map<string, number>();
  for (const skill of catalogue) {
    const xp = xpBySkill.get(skill.id) ?? 0;
    const passed = attempts.filter((attempt) => attempt.skillId === skill.id);
    const proven = completedProjects.filter(
      (project) => project.evidence.length > 0 && project.skills.some((entry) => entry.skillId === skill.id),
    );
    if (xp === 0 && passed.length === 0 && proven.length === 0) continue;

    const progress = getSkillProgress(skill.baseXp, skill.maxLevel, xp);
    const facts = { xp, atMaxLevel: progress.mastered, passedKinds: new Set(passed.map((a) => a.kind)), provenProjects: proven.length };

    // Best pass per assessment, ability first.
    const bestByKey = new Map<string, (typeof passed)[number]>();
    for (const attempt of passed) {
      const current = bestByKey.get(attempt.assessmentKey);
      if (!current || attempt.percent > current.percent) bestByKey.set(attempt.assessmentKey, attempt);
    }
    const kindRank: Record<AssessmentKind, number> = { PROJECT: 0, PRACTICAL: 1, QUIZ: 2 };

    skills.push({
      id: skill.id,
      slug: skill.slug,
      name: skill.name,
      tree: { slug: skill.tree.slug, name: skill.tree.name, emoji: skill.tree.emoji },
      level: progress.level,
      maxLevel: skill.maxLevel,
      // "Mastered" is a proof tier, not a level: an unproven top level says so.
      levelLabel: progress.mastered && proofTier(facts) !== "MASTERED" ? "Top level" : skillLevelLabel(progress.level, skill.maxLevel),
      xp,
      tier: proofTier(facts),
      assessments: [...bestByKey.values()]
        .sort((a, b) => kindRank[a.kind] - kindRank[b.kind] || b.percent - a.percent)
        .map(({ title, kind, evaluator, percent }) => ({ title, kind, evaluator, percent })),
      projects: proven.map(({ id, title }) => ({ id, title })),
    });
    strength.set(skill.id, proofStrength(facts));
  }
  skills.sort((a, b) => strength.get(b.id)! - strength.get(a.id)! || a.name.localeCompare(b.name));

  const demonstrated = (tier: ProofTier) => tier === "DEMONSTRATED" || tier === "MASTERED";

  // ─── Mastery areas: trees ranked by proof, then practice ─────────────────
  const areas = new Map<string, MasteryArea>();
  for (const skill of catalogue) {
    const area = areas.get(skill.tree.slug) ?? {
      slug: skill.tree.slug,
      name: skill.tree.name,
      emoji: skill.tree.emoji,
      lifeArea: skill.tree.lifeArea,
      xp: 0,
      skillsActive: 0,
      skillsDemonstrated: 0,
      skillsMastered: 0,
      totalSkills: 0,
    };
    area.totalSkills += 1;
    areas.set(skill.tree.slug, area);
  }
  for (const skill of skills) {
    const area = areas.get(skill.tree.slug)!;
    area.xp += skill.xp;
    area.skillsActive += 1;
    if (demonstrated(skill.tier)) area.skillsDemonstrated += 1;
    if (skill.tier === "MASTERED") area.skillsMastered += 1;
  }
  const masteryAreas = [...areas.values()]
    .filter((area) => area.skillsActive > 0)
    .sort((a, b) => b.skillsMastered - a.skillsMastered || b.skillsDemonstrated - a.skillsDemonstrated || b.xp - a.xp)
    .slice(0, 4);

  // ─── Proof wall ──────────────────────────────────────────────────────────
  const skillName = new Map(catalogue.map((skill) => [skill.id, skill.name]));
  const proof: ProofItem[] = [
    ...projects.flatMap((project) =>
      project.evidence.map(
        (item): ProofItem => ({
          ...item,
          source: { type: "project", title: project.title, href: `/projects/${project.id}` },
          skills: project.skills.map((entry) => entry.skill.name),
        }),
      ),
    ),
    ...attempts.flatMap((attempt) =>
      attempt.evidence.map(
        (item): ProofItem => ({
          ...item,
          source: { type: "assessment", title: attempt.title, href: `/assessments/attempts/${attempt.id}` },
          skills: [skillName.get(attempt.skillId) ?? ""].filter(Boolean),
        }),
      ),
    ),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  // ─── Milestone timeline ──────────────────────────────────────────────────
  const milestones: PassportMilestone[] = [
    ...goals.flatMap((goal) =>
      goal.completedAt
        ? [{ id: `goal-${goal.id}`, date: goal.completedAt, kind: "goal" as const, title: goal.title, detail: "Goal completed", emoji: "🏔️", href: `/goals/${goal.id}` }]
        : [],
    ),
    ...goalMilestones.map((milestone) => ({
      id: `gm-${milestone.id}`,
      date: milestone.completedAt!,
      kind: "goal-milestone" as const,
      title: milestone.title,
      detail: `Milestone in “${milestone.goal.title}”`,
      emoji: "🚩",
      href: `/goals/${milestone.goal.id}`,
    })),
    ...completedProjects.map((project) => ({
      id: `project-${project.id}`,
      date: project.completedAt!,
      kind: "project" as const,
      title: project.title,
      detail: `Project completed · ${project.evidence.length} piece${project.evidence.length === 1 ? "" : "s"} of evidence`,
      emoji: PROJECT_CATEGORIES[project.category].emoji,
      href: `/projects/${project.id}`,
    })),
    ...attempts
      .filter((attempt) => attempt.kind !== "QUIZ")
      .map((attempt) => ({
        id: `attempt-${attempt.id}`,
        date: attempt.createdAt,
        kind: "assessment" as const,
        title: attempt.title,
        detail: `Passed with ${attempt.percent}%`,
        emoji: "🔎",
        href: `/assessments/attempts/${attempt.id}`,
      })),
    ...achievements.map((entry) => ({
      id: `achievement-${entry.achievement.slug}`,
      date: entry.unlockedAt,
      kind: "achievement" as const,
      title: entry.achievement.name,
      detail: "Achievement unlocked",
      emoji: EMOJI_BY_ACHIEVEMENT.get(entry.achievement.slug) ?? "🏆",
    })),
    ...challenges.flatMap((challenge) =>
      challenge.completedAt
        ? [{ id: `challenge-${challenge.id}`, date: challenge.completedAt, kind: "challenge" as const, title: challenge.title, detail: "Challenge completed", emoji: challenge.emoji, href: "/journey" }]
        : [],
    ),
  ]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 16);

  const progress = getLevelProgress(totalXp);
  const assessmentsPassed = new Set(attempts.map((attempt) => attempt.assessmentKey)).size;

  return {
    identity: {
      displayName: user.displayName,
      pronouns: user.pronouns,
      bio: user.bio,
      motto: character.motto,
      appearance: toAppearance(character),
      level: progress.level,
      tier: tierForLevel(progress.level),
      totalXp,
      memberSince: user.createdAt,
    },
    stats: {
      skillsActive: skills.length,
      skillsDemonstrated: skills.filter((skill) => demonstrated(skill.tier)).length,
      skillsMastered: skills.filter((skill) => skill.tier === "MASTERED").length,
      projectsCompleted: completedProjects.length,
      assessmentsPassed,
      achievements: achievements.length,
      challengesCompleted: challenges.length,
      proofItems: proof.length,
    },
    masteryAreas,
    skills,
    projects: projects
      .filter((project) => project.status !== "PLANNING" || project.evidence.length > 0)
      .map((project) => ({
        id: project.id,
        title: project.title,
        description: project.description,
        category: {
          key: project.category,
          label: PROJECT_CATEGORIES[project.category].label,
          emoji: PROJECT_CATEGORIES[project.category].emoji,
        },
        status: project.status,
        completedAt: project.completedAt,
        reflection: project.reflection,
        skills: project.skills.map((entry) => entry.skill.name),
        milestones: { done: project.milestones.filter((m) => m.completedAt).length, total: project.milestones.length },
        evidenceCount: project.evidence.length,
      })),
    assessments: [...new Map(attempts.map((attempt) => [attempt.assessmentKey, attempt])).values()].map((attempt) => ({
      id: attempt.id,
      title: attempt.title,
      kind: attempt.kind,
      evaluator: attempt.evaluator,
      percent: attempt.percent,
      date: attempt.createdAt,
      skill: skillName.get(attempt.skillId) ?? "",
    })),
    achievements: achievements.map((entry) => ({
      slug: entry.achievement.slug,
      name: entry.achievement.name,
      description: entry.achievement.description,
      emoji: EMOJI_BY_ACHIEVEMENT.get(entry.achievement.slug) ?? "🏆",
      unlockedAt: entry.unlockedAt,
    })),
    challenges: challenges.map((challenge) => ({
      id: challenge.id,
      title: challenge.title,
      emoji: challenge.emoji,
      days: challenge.targetDays,
      completedAt: challenge.completedAt,
    })),
    experiences: experiences.map((entry) => ({ id: entry.id, title: entry.quest.title, note: entry.note, date: entry.completedAt })),
    proof: proof.slice(0, 12),
    milestones,
  };
}
