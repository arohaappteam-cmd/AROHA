import Link from "next/link";

import { cn } from "@/lib/utils";

const TABS = [
  { href: "/journey", label: "Progression" },
  { href: "/journey/challenges", label: "Challenges & streaks" },
  { href: "/journey/timeline", label: "Life timeline" },
] as const;

export function JourneyTabs({ active }: { active: (typeof TABS)[number]["href"] }) {
  return (
    <nav aria-label="Journey views" className="flex gap-1 overflow-x-auto overflow-y-hidden border-b [scrollbar-width:none]">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={tab.href === active ? "page" : undefined}
          className={cn(
            "-mb-px shrink-0 border-b-2 px-3 py-2 text-sm transition-colors",
            tab.href === active ? "border-primary font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
