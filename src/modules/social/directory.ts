import type { BoardSubject } from "./leaderboards";
import type { GroupChallenge, GroupParticipant, Guild, SocialPerson } from "./types";

/**
 * The one door between AROHA and other people. The live implementation
 * (server/services/community-directory.ts) reads real members from the
 * database; tests can supply their own.
 *
 * Every person it returns chose to be visible (profile set to COMMUNITY),
 * and carries only the parts of their record they chose to share.
 */
export interface SocialDirectory {
  listPeople(): Promise<readonly SocialPerson[]>;
  findPerson(handle: string): Promise<SocialPerson | undefined>;
  listGuilds(): Promise<readonly Guild[]>;
  findGuild(slug: string): Promise<Guild | undefined>;
  /** Visible members of one guild. */
  guildMembers(slug: string): Promise<readonly SocialPerson[]>;
  listGroupChallenges(): readonly GroupChallenge[];
  findGroupChallenge(key: string): GroupChallenge | undefined;
  /** Group challenges belonging to one guild. */
  guildChallenges(slug: string): readonly GroupChallenge[];
  /**
   * Who is running a group challenge now. Visible members are named; the
   * rest are only counted. `excludeHandle` leaves the viewer out.
   */
  groupParticipants(key: string, excludeHandle?: string): Promise<{ visible: GroupParticipant[]; others: number }>;
  /** Members who opted in to leaderboards, optionally within one guild. */
  leaderboardSubjects(guildSlug: string | null): Promise<BoardSubject[]>;
}
