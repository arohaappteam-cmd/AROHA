import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * A HUD progress ring: a hairline track with tick marks, and an arc that
 * fills from empty to its value with a soft glow. `value` null means there
 * was nothing to measure — the ring stays an empty track, never a fake 0%.
 */
export function ProgressRing({
  value,
  size = 112,
  stroke = 7,
  label,
  children,
  dimmed = false,
  className,
}: {
  value: number | null;
  size?: number;
  stroke?: number;
  /** Read by screen readers in place of the drawing. */
  label: string;
  children?: ReactNode;
  dimmed?: boolean;
  className?: string;
}) {
  const radius = (size - stroke) / 2 - 4;
  const center = size / 2;
  const length = 2 * Math.PI * radius;
  const fraction = value === null ? 0 : Math.max(0, Math.min(100, value)) / 100;
  const ticks = 40;

  return (
    <div role="img" aria-label={label} className={cn("relative grid shrink-0 place-items-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        {Array.from({ length: ticks }, (_, index) => {
          const angle = (index / ticks) * 2 * Math.PI;
          const inner = radius + stroke / 2 + 2;
          const outer = inner + (index % 10 === 0 ? 4 : 2);
          return (
            <line
              key={index}
              x1={center + inner * Math.cos(angle)}
              y1={center + inner * Math.sin(angle)}
              x2={center + outer * Math.cos(angle)}
              y2={center + outer * Math.sin(angle)}
              className="stroke-border"
              strokeWidth={1}
            />
          );
        })}
        <circle cx={center} cy={center} r={radius} fill="none" className="stroke-muted" strokeWidth={stroke} />
        {fraction > 0 && (
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={length}
            strokeDashoffset={length * (1 - fraction)}
            className={cn("animate-ring-fill motion-reduce:animate-none", dimmed ? "stroke-success/45" : "glow-success stroke-success")}
            style={{ "--ring-length": `${length}` } as CSSProperties}
          />
        )}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}
