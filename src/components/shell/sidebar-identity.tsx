import Link from "next/link";
import { connection } from "next/server";

import { CharacterAvatar } from "@/components/character/character-avatar";
import { toAppearance } from "@/modules/identity/avatar";
import { getLevelProgress, tierForLevel } from "@/modules/progression";
import { getCurrentUser } from "@/server/auth/current-user";
import { identityRepository } from "@/server/repositories/identity.repository";
import { progressionRepository } from "@/server/repositories/progression.repository";

/** Compact identity chip in the sidebar. Rendered inside a Suspense boundary. */
export async function SidebarIdentity() {
  await connection();
  const user = await getCurrentUser();
  const [character, totalXp] = await Promise.all([
    identityRepository.ensureCharacter(user.id),
    progressionRepository.getTotalXp(user.id),
  ]);
  const { level } = getLevelProgress(totalXp);
  const tier = tierForLevel(level);

  return (
    <Link
      href="/character"
      className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-sidebar-accent/60"
    >
      <CharacterAvatar appearance={toAppearance(character)} name={user.displayName} tier={tier} size={36} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{user.displayName}</span>
        <span className="block text-xs text-muted-foreground">
          Level {level} · {tier}
        </span>
      </span>
    </Link>
  );
}

export function SidebarIdentitySkeleton() {
  return (
    <div className="flex items-center gap-3 p-2" aria-hidden>
      <div className="size-9 animate-pulse rounded-full bg-muted" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 w-20 animate-pulse rounded bg-muted" />
        <div className="h-2.5 w-14 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}
