import { EyeOffIcon } from "lucide-react";
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
 * Shown while the viewer's own profile is private: they can browse and join,
 * but nobody can find them or ask them anything until they choose otherwise.
 */
export function PrivateProfileNotice({ visibility }: { visibility: "PRIVATE" | "COMMUNITY" }) {
  if (visibility === "COMMUNITY") return null;
  return (
    <p className="flex items-start gap-2 rounded-lg border border-dashed bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
      <EyeOffIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>
        <strong className="font-medium text-foreground">Your profile is private.</strong> You can browse, join guilds and take part in
        group challenges, but other members can&apos;t find you or ask you to mentor.{" "}
        <Link href="/community/profile" className="underline underline-offset-4">
          Change what you share
        </Link>
      </span>
    </p>
  );
}
