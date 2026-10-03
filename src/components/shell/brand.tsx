import Link from "next/link";
import { useId } from "react";

import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

/** The AROHA mark: a summit with a waypoint and a spark — the same art as src/app/icon.svg. */
export function BrandMark({ size = 32, className }: { size?: number; className?: string }) {
  const id = `brand${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden className={cn("shrink-0", className)}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7c3aed" />
          <stop offset="0.55" stopColor="#c026d3" />
          <stop offset="1" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill={`url(#${id})`} />
      <path d="M16.5 47 L32 16.5 L47.5 47" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="32" cy="38" r="3.6" fill="#fff" />
      <path d="M48.5 8.5c.7 3.9 1.7 4.9 5.6 5.6-3.9.7-4.9 1.7-5.6 5.6-.7-3.9-1.7-4.9-5.6-5.6 3.9-.7 4.9-1.7 5.6-5.6z" fill="#fff" />
    </svg>
  );
}

export function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label={`${siteConfig.name} home`}>
      <BrandMark />
      <span className="text-gradient-brand text-sm font-bold tracking-[0.24em]">{siteConfig.name}</span>
    </Link>
  );
}
