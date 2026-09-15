import type { AvatarStyle } from "@/generated/prisma/enums";
import type { TierTitle } from "@/modules/progression/levels";

export const AVATAR_STYLES = [
  { key: "ORB", label: "Orb", description: "Soft and radiant" },
  { key: "CREST", label: "Crest", description: "Bold and grounded" },
  { key: "MONOGRAM", label: "Monogram", description: "Clean and personal" },
] as const satisfies readonly { key: AvatarStyle; label: string; description: string }[];

/** Two-stop gradients; values are CSS colors usable in SVG. */
export const AVATAR_COLORS = {
  violet: { label: "Violet", from: "oklch(0.72 0.17 290)", to: "oklch(0.48 0.2 280)" },
  indigo: { label: "Indigo", from: "oklch(0.7 0.14 265)", to: "oklch(0.45 0.17 262)" },
  sky: { label: "Sky", from: "oklch(0.8 0.12 225)", to: "oklch(0.55 0.14 235)" },
  teal: { label: "Teal", from: "oklch(0.8 0.12 185)", to: "oklch(0.52 0.11 190)" },
  emerald: { label: "Emerald", from: "oklch(0.78 0.15 155)", to: "oklch(0.5 0.13 160)" },
  amber: { label: "Amber", from: "oklch(0.86 0.15 85)", to: "oklch(0.62 0.15 60)" },
  coral: { label: "Coral", from: "oklch(0.78 0.14 35)", to: "oklch(0.56 0.18 25)" },
  rose: { label: "Rose", from: "oklch(0.78 0.13 355)", to: "oklch(0.52 0.18 358)" },
  slate: { label: "Slate", from: "oklch(0.7 0.03 260)", to: "oklch(0.42 0.03 260)" },
} as const;

export type AvatarColor = keyof typeof AVATAR_COLORS;
export const AVATAR_COLOR_KEYS = Object.keys(AVATAR_COLORS) as [AvatarColor, ...AvatarColor[]];

/** Emblems are stored by key so the glyph can change without a migration. */
export const AVATAR_EMBLEMS = {
  sprout: { label: "Sprout", glyph: "🌱" },
  flame: { label: "Flame", glyph: "🔥" },
  bolt: { label: "Bolt", glyph: "⚡" },
  wave: { label: "Wave", glyph: "🌊" },
  mountain: { label: "Mountain", glyph: "🏔️" },
  moon: { label: "Moon", glyph: "🌙" },
  sun: { label: "Sun", glyph: "☀️" },
  star: { label: "Star", glyph: "⭐" },
  compass: { label: "Compass", glyph: "🧭" },
  target: { label: "Target", glyph: "🎯" },
  book: { label: "Book", glyph: "📖" },
  palette: { label: "Palette", glyph: "🎨" },
  music: { label: "Music", glyph: "🎵" },
  tools: { label: "Tools", glyph: "🛠️" },
  leaf: { label: "Leaf", glyph: "🍃" },
  gem: { label: "Gem", glyph: "💎" },
  owl: { label: "Owl", glyph: "🦉" },
  wolf: { label: "Wolf", glyph: "🐺" },
  eagle: { label: "Eagle", glyph: "🦅" },
  planet: { label: "Planet", glyph: "🪐" },
} as const;

export type AvatarEmblem = keyof typeof AVATAR_EMBLEMS;
export const AVATAR_EMBLEM_KEYS = Object.keys(AVATAR_EMBLEMS) as [AvatarEmblem, ...AvatarEmblem[]];

export type AvatarAppearance = {
  style: AvatarStyle;
  color: AvatarColor;
  emblem: AvatarEmblem;
};

export const DEFAULT_APPEARANCE: AvatarAppearance = {
  style: "ORB",
  color: "violet",
  emblem: "sprout",
};

/** Coerces stored values, falling back to defaults for unknown keys. */
export function toAppearance(stored: {
  avatarStyle: AvatarStyle;
  avatarColor: string;
  avatarEmblem: string;
}): AvatarAppearance {
  return {
    style: stored.avatarStyle,
    color: stored.avatarColor in AVATAR_COLORS ? (stored.avatarColor as AvatarColor) : DEFAULT_APPEARANCE.color,
    emblem: stored.avatarEmblem in AVATAR_EMBLEMS ? (stored.avatarEmblem as AvatarEmblem) : DEFAULT_APPEARANCE.emblem,
  };
}

export type AvatarEvolution = {
  /** Number of concentric rings drawn around the avatar. */
  rings: 0 | 1 | 2 | 3;
  /** Whether the outer glow is shown. */
  glow: boolean;
  /** Orbiting sparks, introduced at higher tiers. */
  sparks: number;
};

/**
 * Visual evolution by progression tier (spec §30). Purely derived — the
 * avatar changes as the user levels up, without storing anything.
 */
export function evolutionForTier(tier: TierTitle): AvatarEvolution {
  switch (tier) {
    case "Beginner":
      return { rings: 0, glow: false, sparks: 0 };
    case "Explorer":
      return { rings: 1, glow: false, sparks: 0 };
    case "Practitioner":
      return { rings: 1, glow: true, sparks: 2 };
    case "Advanced":
      return { rings: 2, glow: true, sparks: 4 };
    case "Master":
      return { rings: 3, glow: true, sparks: 6 };
  }
}

export function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = Array.from(parts[0])[0] ?? "";
  const last = parts.length > 1 ? (Array.from(parts.at(-1)!)[0] ?? "") : "";
  return (first + last).toUpperCase();
}
