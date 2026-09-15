"use client";

import { CheckIcon } from "lucide-react";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/** A toggle button styled as a chip. Uses aria-pressed for state. */
export function ChoiceChip({
  selected,
  className,
  children,
  showCheck = false,
  ...props
}: ComponentProps<"button"> & { selected: boolean; showCheck?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
        selected
          ? "border-primary bg-primary/15 text-foreground"
          : "text-muted-foreground hover:border-foreground/30 hover:text-foreground",
        className,
      )}
      {...props}
    >
      {showCheck && selected && <CheckIcon className="size-3.5 text-primary" aria-hidden />}
      {children}
    </button>
  );
}
