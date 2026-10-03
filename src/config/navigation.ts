import {
  ChartLineIcon,
  ClipboardCheckIcon,
  CompassIcon,
  FolderKanbanIcon,
  GitBranchIcon,
  HouseIcon,
  IdCardIcon,
  MapIcon,
  MessageCircleIcon,
  NotebookPenIcon,
  RouteIcon,
  UserRoundIcon,
  UsersRoundIcon,
  type LucideIcon,
} from "lucide-react";

import type { PlanTier } from "@/generated/prisma/enums";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  description: string;
  /** False until the section is actually built; rendered as non-clickable. */
  available: boolean;
  /** Icon colour, so each destination is recognisable before it's read. */
  tone: string;
  /** Shown as a small badge when the destination belongs to a paid plan. */
  plan?: PlanTier;
};

export type NavSection = { label: string; items: readonly NavItem[] };

const item = {
  home: { label: "Home", href: "/", icon: HouseIcon, description: "Today's journey", available: true, tone: "text-violet-300" },
  journal: { label: "Journal", href: "/journal", icon: NotebookPenIcon, description: "Daily reflection and your private journal", available: true, tone: "text-amber-300" },
  goals: { label: "Goals", href: "/goals", icon: MapIcon, description: "Roadmaps and missions", available: true, tone: "text-rose-300" },
  skills: { label: "Skills", href: "/skills", icon: GitBranchIcon, description: "Skill trees, unlocks and mastery", available: true, tone: "text-emerald-300" },
  projects: { label: "Projects", href: "/projects", icon: FolderKanbanIcon, description: "Real things you make, with evidence", available: true, tone: "text-orange-300" },
  assessments: { label: "Assessments", href: "/assessments", icon: ClipboardCheckIcon, description: "Quizzes, practical tasks and project reviews", available: true, tone: "text-sky-300" },
  character: { label: "Character", href: "/character", icon: UserRoundIcon, description: "Level, XP, stats and skills", available: true, tone: "text-fuchsia-300" },
  passport: { label: "Passport", href: "/passport", icon: IdCardIcon, description: "Your living record of proven capability", available: true, tone: "text-cyan-300" },
  journey: { label: "Journey", href: "/journey", icon: RouteIcon, description: "Progression map, challenges, streaks and timeline", available: true, tone: "text-indigo-300" },
  insights: { label: "Insights", href: "/insights", icon: ChartLineIcon, description: "Trends, balance and patterns in your growth", available: true, tone: "text-sky-300", plan: "PRO" },
  discover: { label: "Discover", href: "/discover", icon: CompassIcon, description: "Experiments: try something new for a while", available: true, tone: "text-teal-300" },
  community: { label: "Community", href: "/community", icon: UsersRoundIcon, description: "Guilds, group challenges and mentorship", available: true, tone: "text-pink-300" },
  mentor: {
    label: "Mentor",
    href: "/mentor",
    icon: MessageCircleIcon,
    description: "Conversation, insights and recommendations",
    // The AI Mentor is coming soon; shown with a "Soon" badge, not linked.
    available: false,
    tone: "text-amber-300",
    plan: "PREMIUM",
  },
} satisfies Record<string, NavItem>;

/**
 * The sidebar, grouped by intent (spec §58) so a destination is found by
 * scanning a short labelled group, not a list of thirteen.
 */
export const navSections: readonly NavSection[] = [
  { label: "Today", items: [item.home, item.journal] },
  { label: "Grow", items: [item.goals, item.skills, item.projects, item.assessments] },
  { label: "Progress", items: [item.character, item.journey, item.passport, item.insights] },
  { label: "Explore", items: [item.discover, item.community, item.mentor] },
];

export const primaryNav: readonly NavItem[] = navSections.flatMap((section) => section.items);

/** The phone tab bar: the places people go daily, one thumb away. "More" opens the rest. */
export const mobileTabs: readonly NavItem[] = [item.home, item.goals, item.journey, item.community];

export function isActivePath(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" || pathname.startsWith("/quests/") : pathname === href || pathname.startsWith(`${href}/`);
}
