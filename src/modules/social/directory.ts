import { findGroupChallenge, findGuild, GROUP_CHALLENGES, GUILDS } from "./guilds";
import { findPerson, PEOPLE } from "./people";
import type { GroupChallenge, Guild, SocialPerson } from "./types";

/**
 * The one door between AROHA and other people. Today it opens onto seeded
 * sample data; when real accounts arrive, a second implementation reads them
 * from the database and nothing above this line changes.
 *
 * `kind` is carried through to the UI so the app can always say plainly that
 * these people are a demonstration.
 */
export interface SocialDirectory {
  readonly kind: "seeded" | "live";
  listPeople(): readonly SocialPerson[];
  findPerson(handle: string): SocialPerson | undefined;
  listGuilds(): readonly Guild[];
  findGuild(slug: string): Guild | undefined;
  guildMembers(slug: string): readonly SocialPerson[];
  listGroupChallenges(): readonly GroupChallenge[];
  findGroupChallenge(key: string): GroupChallenge | undefined;
  /** Group challenges belonging to one guild. */
  guildChallenges(slug: string): readonly GroupChallenge[];
}

export const seededDirectory: SocialDirectory = {
  kind: "seeded",
  listPeople: () => PEOPLE,
  findPerson,
  listGuilds: () => GUILDS,
  findGuild,
  guildMembers: (slug) => PEOPLE.filter((person) => person.guilds.includes(slug)),
  listGroupChallenges: () => GROUP_CHALLENGES,
  findGroupChallenge,
  guildChallenges: (slug) => GROUP_CHALLENGES.filter((challenge) => challenge.guildSlug === slug),
};
