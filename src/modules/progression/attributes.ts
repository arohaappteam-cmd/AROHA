import type { Attribute } from "@/generated/prisma/enums";

export type AttributeMeta = {
  key: Attribute;
  label: string;
  emoji: string;
  description: string;
};

/** Character attributes (spec §14), in display order. */
export const ATTRIBUTES: readonly AttributeMeta[] = [
  {
    key: "INTELLECT",
    label: "Intellect",
    emoji: "🧠",
    description: "Learning, reasoning, knowledge, problem solving.",
  },
  {
    key: "STRENGTH",
    label: "Strength",
    emoji: "💪",
    description: "Physical development and fitness.",
  },
  {
    key: "SOCIAL",
    label: "Social",
    emoji: "🗣️",
    description: "Communication, relationships and social confidence.",
  },
  {
    key: "CREATIVITY",
    label: "Creativity",
    emoji: "🎨",
    description: "Creation, art, design and creative thinking.",
  },
  {
    key: "DISCIPLINE",
    label: "Discipline",
    emoji: "🎯",
    description: "Consistency, follow-through and completing difficult objectives.",
  },
  {
    key: "SKILLS",
    label: "Skills",
    emoji: "🛠️",
    description: "Practical abilities developed through learning and practice.",
  },
];
