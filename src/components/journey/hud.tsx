import { ArrowDownRightIcon, ArrowUpRightIcon, MinusIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** The small monospaced caption HUD panels and stats are labelled with. */
export function HudLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("font-mono text-[10px] font-medium tracking-[0.22em] text-muted-foreground uppercase", className)}>{children}</p>;
}

/**
 * One section of the progression map: a framed panel with a numbered
 * caption, a title, and whatever controls belong to just this panel.
 */
export function HudPanel({
  id,
  index,
  label,
  title,
  description,
  actions,
  children,
  className,
}: {
  id?: string;
  index?: string;
  label: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const headingId = id ? `${id}-title` : undefined;
  return (
    <section id={id} aria-labelledby={headingId} className={cn("hud-panel scroll-mt-28 p-4 sm:p-6", className)}>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <HudLabel>
            {index && <span className="text-foreground/70">{index} · </span>}
            {label}
          </HudLabel>
          <h2 id={headingId} className="text-lg font-semibold tracking-tight sm:text-xl">
            {title}
          </h2>
          {description && <p className="max-w-prose text-sm text-pretty text-muted-foreground">{description}</p>}
        </div>
        {actions}
      </header>
      {children}
    </section>
  );
}

/** A thin progress bar that fills from empty on first paint. */
export function Meter({
  percent,
  label,
  className,
  tone = "success",
  size = "md",
}: {
  percent: number;
  label: string;
  className?: string;
  tone?: "success" | "muted";
  size?: "sm" | "md";
}) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      className={cn("overflow-hidden rounded-full bg-muted", size === "sm" ? "h-1.5" : "h-2", className)}
    >
      <div
        className={cn(
          "h-full origin-left animate-grow-x rounded-full motion-reduce:animate-none",
          tone === "success" ? "bg-success" : "bg-muted-foreground/45",
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

/**
 * A signed change against an earlier period. Only "up" is lit — a dip is
 * stated plainly in muted ink, never painted as a failure.
 */
export function Delta({ value, unit = "", suffix, className }: { value: number | null; unit?: string; suffix?: string; className?: string }) {
  if (value === null) return <span className={cn("text-xs text-muted-foreground", className)}>New</span>;
  const Icon = value > 0 ? ArrowUpRightIcon : value < 0 ? ArrowDownRightIcon : MinusIcon;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs tabular-nums", value > 0 ? "text-success" : "text-muted-foreground", className)}>
      <Icon className="size-3.5" aria-hidden />
      {value > 0 ? "+" : value < 0 ? "−" : "±"}
      {Math.abs(value).toLocaleString("en")}
      {unit}
      {suffix && <span className="text-muted-foreground"> {suffix}</span>}
    </span>
  );
}
