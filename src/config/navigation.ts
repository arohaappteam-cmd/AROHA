import {
  CompassIcon,
  GitBranchIcon,
  HouseIcon,
  MapIcon,
  MessageCircleIcon,
  RouteIcon,
  UserRoundIcon,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  description: string;
  /** False until the section is actually built; rendered as non-clickable. */
  available: boolean;
};

/** Primary navigation (spec §58). */
export const primaryNav: readonly NavItem[] = [
  {
    label: "Home",
    href: "/",
    icon: HouseIcon,
    description: "Today's journey",
    available: true,
  },
  {
    label: "Goals",
    href: "/goals",
    icon: MapIcon,
    description: "Roadmaps and missions",
    available: true,
  },
  {
    label: "Character",
    href: "/character",
    icon: UserRoundIcon,
    description: "Level, XP, stats and skills",
    available: true,
  },
  {
    label: "Skills",
    href: "/skills",
    icon: GitBranchIcon,
    description: "Skill trees, unlocks and mastery",
    available: true,
  },
  {
    label: "Journey",
    href: "/journey",
    icon: RouteIcon,
    description: "Challenges, streaks and achievements",
    available: true,
  },
  {
    label: "Discover",
    href: "/discover",
    icon: CompassIcon,
    description: "Learning, experiments and new experiences",
    available: false,
  },
  {
    label: "Mentor",
    href: "/mentor",
    icon: MessageCircleIcon,
    description: "Conversation, insights and recommendations",
    available: true,
  },
];
