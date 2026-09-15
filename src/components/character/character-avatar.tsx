import { useId } from "react";

import type { AvatarStyle } from "@/generated/prisma/enums";
import {
  AVATAR_COLORS,
  AVATAR_EMBLEMS,
  evolutionForTier,
  initialsFor,
  type AvatarAppearance,
} from "@/modules/identity/avatar";
import type { TierTitle } from "@/modules/progression/levels";
import { cn } from "@/lib/utils";

const CENTER = 60;
const RING_RADII = [52, 56.5, 59] as const;

function BaseShape({ style, fill }: { style: AvatarStyle; fill: string }) {
  switch (style) {
    case "ORB":
      return (
        <>
          <circle cx={CENTER} cy={CENTER} r={42} fill={fill} />
          <ellipse cx={48} cy={42} rx={18} ry={11} fill="white" opacity={0.18} />
        </>
      );
    case "CREST":
      return (
        <>
          <path
            d="M60 16 L96 29 V58 C96 80 81 95 60 104 C39 95 24 80 24 58 V29 Z"
            fill={fill}
          />
          <path
            d="M60 16 L96 29 V58 C96 64 95 69 93 74 C80 60 52 42 26 38 L24 29 Z"
            fill="white"
            opacity={0.1}
          />
        </>
      );
    case "MONOGRAM":
      return (
        <>
          <rect x={20} y={20} width={80} height={80} rx={24} fill={fill} />
          <rect x={20} y={20} width={80} height={36} rx={24} fill="white" opacity={0.1} />
        </>
      );
  }
}

/**
 * The character avatar. Appearance is chosen by the user; rings, glow and
 * sparks are earned through progression tiers (spec §30).
 */
export function CharacterAvatar({
  appearance,
  name,
  tier,
  size = 96,
  className,
}: {
  appearance: AvatarAppearance;
  name: string;
  tier: TierTitle;
  size?: number;
  className?: string;
}) {
  const palette = AVATAR_COLORS[appearance.color];
  const evolution = evolutionForTier(tier);
  // Per-instance ids: `url(#id)` resolves to the first match in the document,
  // which may sit inside a hidden (display:none) copy and never paint.
  const id = `av${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const fill = `url(#${id}-fill)`;
  const label = appearance.style === "MONOGRAM" ? initialsFor(name) : AVATAR_EMBLEMS[appearance.emblem].glyph;

  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      role="img"
      aria-label={`${name}'s avatar, ${tier} tier`}
      className={cn("shrink-0 overflow-visible", className)}
    >
      <defs>
        <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={palette.from} />
          <stop offset="100%" stopColor={palette.to} />
        </linearGradient>
        <radialGradient id={`${id}-glow`}>
          <stop offset="55%" stopColor={palette.from} stopOpacity={0.45} />
          <stop offset="100%" stopColor={palette.from} stopOpacity={0} />
        </radialGradient>
      </defs>

      {evolution.glow && <circle cx={CENTER} cy={CENTER} r={64} fill={`url(#${id}-glow)`} />}

      {RING_RADII.slice(0, evolution.rings).map((r, index) => (
        <circle
          key={r}
          cx={CENTER}
          cy={CENTER}
          r={r}
          fill="none"
          stroke={palette.from}
          strokeOpacity={0.7 - index * 0.2}
          strokeWidth={index === 0 ? 1.5 : 1}
          strokeDasharray={index === 1 ? "3 4" : undefined}
        />
      ))}

      {Array.from({ length: evolution.sparks }, (_, index) => {
        const angle = (index / evolution.sparks) * Math.PI * 2 - Math.PI / 2;
        return (
          <circle
            key={index}
            cx={CENTER + Math.cos(angle) * RING_RADII[0]}
            cy={CENTER + Math.sin(angle) * RING_RADII[0]}
            r={2}
            fill={palette.from}
          />
        );
      })}

      <BaseShape style={appearance.style} fill={fill} />

      <text
        x={CENTER}
        y={appearance.style === "CREST" ? 62 : CENTER}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={appearance.style === "MONOGRAM" ? (label.length > 1 ? 30 : 36) : 34}
        fontWeight={600}
        fill="white"
        style={{ fontFamily: "var(--font-sans), system-ui, sans-serif" }}
      >
        {label}
      </text>
    </svg>
  );
}
