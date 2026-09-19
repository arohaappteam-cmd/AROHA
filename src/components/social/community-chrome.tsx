import { FlaskConicalIcon } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

const TABS = [
  { href: "/community", label: "Overview" },
  { href: "/community/guilds", label: "Guilds" },
  { href: "/community/challenges", label: "Group challenges" },
  { href: "/community/leaderboards", label: "Leaderboards" },
  { href: "/community/mentorship", label: "Mentorship" },
  { href: "/community/profile", label: "Your sharing" },
] as const;

export type CommunityTab = (typeof TABS)[number]["href"];

export function CommunityTabs({ active }: { active: CommunityTab }) {
  return (
    <nav aria-label="Community views" className="-mx-1 flex gap-1 overflow-x-auto border-b px-1">
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

/**
 * Said plainly, on every community page: these people are a demonstration.
 * Nothing here is a real account and nothing the user does is sent anywhere.
 */
export function DemoNotice({ kind }: { kind: "seeded" | "live" }) {
  if (kind === "live") return null;
  return (
    <p className="flex items-start gap-2 rounded-lg border border-dashed bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
      <FlaskConicalIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>
        <strong className="font-medium text-foreground">A preview of the social layer.</strong> The people, guilds and group
        challenges here are sample data, not real accounts — nothing you do is sent to anyone. What is real is your side: guilds
        you join, challenges you start and mentorships you record are kept in your own account.
      </span>
    </p>
  );
}
