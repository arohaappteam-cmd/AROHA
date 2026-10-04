import Link from "next/link";

import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

/**
 * The AROHA mark: a summit with a waypoint and a spark — the same art as
 * src/app/icon.svg. Monochrome, like the rest of the interface chrome.
 */
export function BrandMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden className={cn("shrink-0", className)}>
      <rect width="64" height="64" rx="16" className="fill-primary" />
      <g className="fill-primary-foreground stroke-primary-foreground">
        <path d="M16.5 47 L32 16.5 L47.5 47" fill="none" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="32" cy="38" r="3.6" stroke="none" />
        <path d="M48.5 8.5c.7 3.9 1.7 4.9 5.6 5.6-3.9.7-4.9 1.7-5.6 5.6-.7-3.9-1.7-4.9-5.6-5.6 3.9-.7 4.9-1.7 5.6-5.6z" stroke="none" />
      </g>
    </svg>
  );
}

export function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label={`${siteConfig.name} home`}>
      <BrandMark />
      <span className="text-sm font-semibold tracking-[0.2em]">{siteConfig.name}</span>
    </Link>
  );
}
