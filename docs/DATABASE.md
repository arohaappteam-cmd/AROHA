# Database

PostgreSQL (Supabase in production, any Postgres locally), accessed through
Prisma 7 with the node-postgres driver adapter. The schema is
[`prisma/schema.prisma`](../prisma/schema.prisma); every table and column is
commented there. This page explains the shape, the design rules and how it's
tuned for speed.

---

## The model at a glance

37 tables in nine groups. Every user-owned row carries `userId` and is
deleted with its user (`onDelete: Cascade`).

| Group | Tables | Notes |
| --- | --- | --- |
| **Identity** | `User`, `Character`, `UserPreferences`, `UserInterest`, `UserLifeArea`, `PlanInterest` | `User.authId` links to Supabase Auth; `User.plan` is the tier; `User.totalXp` is the XP rollup |
| **Goals** | `Goal`, `Milestone`, `Mission`, `RoadmapRevision` | Goal → milestones → missions; every generated roadmap is snapshotted |
| **Quests** | `DailyQuestSet`, `Quest`, `QuestCompletion` | One set per user per calendar day; one quest per slot |
| **Progression ledger** | `XpTransaction`, `StatTransaction` | Append-only; unique per source |
| **Skills** | `SkillTree`, `Skill`, `UserSkill`, `SkillXpTransaction` | Trees and skills are catalogue rows; per-skill XP is a ledger |
| **Proof** | `Project`, `ProjectSkill`, `ProjectMilestone`, `Evidence`, `AssessmentAttempt` | Projects complete only with evidence; attempts snapshot their definition |
| **Motivation** | `Achievement`, `UserAchievement`, `Challenge`, `ChallengeDay` | Streaks aren't stored — they're derived from completions |
| **Reflection** | `Reflection`, `JournalEntry`, `Experiment`, `ExperimentDay` | The journal is private to its owner |
| **Community** | `SocialProfile`, `GuildMembership`, `GroupChallengeEntry`, `Mentorship`, `MentorshipMessage` | Private by default; mentorship is two-sided |

Catalogue tables (`SkillTree`, `Skill`, `Achievement`) are filled from code
(`src/modules/skills/catalogue.ts`, `src/modules/achievements/catalogue.ts`)
by `npm run db:seed`, which every production deploy runs. Guilds and group
challenges are catalogue *code* only; their tables store memberships.

---

## Design rules

1. **The backend owns game state.** AI output is never written directly into
   progression tables.
2. **Progression is a ledger, not a number.** XP, attribute gains and skill
   XP are append-only transactions. Level, tier and attributes are derived by
   summing them, so every point traces back to a real action and undo
   removes exactly what was awarded.
3. **One action pays once.** `XpTransaction` is unique on
   `(sourceType, sourceId)` and `SkillXpTransaction` on
   `(skillId, sourceType, sourceId)`. Double submits and refreshes hit the
   constraint instead of paying twice. `sourceId` must identify one user's
   action (a quest id, or `userId:key` for things everyone can earn).
4. **Days are generated once.** `DailyQuestSet` is unique on
   `(userId, date)` and `Quest` on `(dailyQuestSetId, slot)`, so concurrent
   page loads can't create duplicate days or quests.
5. **History is kept, not rewritten.** Assessment attempts store the
   definition they were taken against; roadmap revisions store each
   generated plan.
6. **Derived, not stored, wherever practical.** Streaks, timelines,
   analytics and milestone progress are computed from records. The single
   stored total is `User.totalXp` — see below.

---

## Performance

The app runs on Vercel serverless functions talking to Supabase. What makes
that fast:

### 1. Same region

`vercel.json` runs functions in `icn1` (Seoul), next to AROHA's Supabase
project (`ap-northeast-2`). Keep the two in the same
region as the Supabase project — each query then takes ~1 ms instead of
~100 ms. This matters more than anything below. (Region table in
[DEPLOYMENT.md](DEPLOYMENT.md#9-import-the-project).)

### 2. Connection pooling for serverless

- The app connects through Supabase's **transaction pooler** (port 6543,
  `DATABASE_URL`). Many short-lived function instances share a few real
  Postgres connections.
- Each instance keeps a small pg pool (`DATABASE_POOL_MAX`, default 5;
  idle connections close after 10 s) — `src/server/db/create-client.ts`.
- On Vercel's Fluid compute, `attachDatabasePool` (`src/server/db/index.ts`)
  closes idle connections before an instance is suspended, so they don't
  pile up on the pooler.
- Statements are unnamed (no prepared-statement cache), which a transaction
  pooler requires.
- Migrations and seeding use **`DIRECT_URL`** (session pooler, port 5432),
  because they need a session the transaction pooler can't hold
  (`prisma.config.ts`).

### 3. `User.totalXp` — a trigger-maintained rollup

Total XP is needed on almost every page (sidebar, level, leaderboards).
Instead of summing a user's whole ledger each time, the database keeps a
running total:

- Three statement-level triggers on `XpTransaction` (insert, delete,
  update) adjust `User.totalXp` **in the same transaction** as the ledger
  write. Bulk inserts and cascades cost one UPDATE per affected user.
- App code only ever reads it (`progressionRepository.getTotalXp`, the
  progression engine, the community directory, the sidebar).
- The ledger is still the source of truth. To rebuild the rollup:

  ```sql
  UPDATE "User" u SET "totalXp" = COALESCE((SELECT SUM(amount) FROM "XpTransaction" x WHERE x."userId" = u.id), 0);
  ```

- `plans.integration.test.ts` checks the rollup always equals the ledger
  after awards, revokes, bulk writes and account deletion.

### 4. Indexes on every hot path

Postgres doesn't index foreign keys automatically. Every column the app
joins, filters, sorts or cascades on has an index, for example:

| Index | Serves |
| --- | --- |
| `Quest(userId, status)`, `Quest(goalId)`, `Quest(missionId)` | Today's quests, expiring old ones, goal analytics, deleting goals |
| `XpTransaction(userId, createdAt)` | XP history and charts |
| `SkillXpTransaction(userId, sourceType, sourceId)` | Award/revoke lookups on every quest completion |
| `QuestCompletion(userId, completedAt)` | Streaks, analytics |
| `MentorshipMessage(authorId, createdAt)` | The per-hour rate limit |
| `PlanInterest(userId, tier)` unique, `(tier, createdAt)` | "Notify me", interest list |

### 5. Catalogue cache

Skill trees and skills are identical for every user and only change on
deploy, so `cachedCatalogue()` (`src/server/db/catalogue-cache.ts`) keeps
them in memory per warm instance for 10 minutes in production. Development
and tests always read the database.

### 6. Batched reads

The community directory loads all visible members' stats in a fixed number
of grouped queries per request — never one query per person. Pages fetch
independent data in parallel (`Promise.all`).

---

## Migrations

Applied in order from `prisma/migrations/`:

| Migration | Adds |
| --- | --- |
| `init` | Users, goals → milestones → missions, daily quests, XP + stat ledgers, skills, achievements, reflections |
| `identity_character`, `identity_saved_timestamps` | Character, preferences, interests, life areas |
| `goal_system` | Roadmap revisions, goal lifecycle (pause, archive, starting point) |
| `daily_quests` | Quest slots, energy, payloads, skipping and carry-over |
| `skill_system` | Skill trees, skill XP ledger, unlock rules |
| `motivation_systems` | Challenges and challenge days |
| `projects_assessments_proof` | Projects, evidence, assessments |
| `community_layer` | Social profiles, guilds, group challenges, mentorship |
| `journal_reflection_experiments` | Journal, reflections, experiments |
| `accounts_and_live_community` | Supabase `authId`, two-sided mentorship, notes |
| `lock_public_api` | Row Level Security on every table |
| `performance_and_plans` | Plans, `PlanInterest`, `totalXp` + triggers + backfill, new indexes |

### Working with migrations

```bash
# change prisma/schema.prisma, then:
npm run db:migrate -- --name describe_the_change
```

- Add `ALTER TABLE "X" ENABLE ROW LEVEL SECURITY;` for every new table.
- Things Prisma can't express (triggers, functions) go into the generated
  SQL file by hand before applying — see `performance_and_plans`.
- Never edit a migration that has been deployed; add a new one.
- Production applies pending migrations automatically during the Vercel
  production build (`scripts/vercel-build.mjs`). Preview builds don't.

## Local database

```bash
cp .env.example .env     # DATABASE_URL=postgresql://…localhost:5432/aroha
npm run db:migrate       # create tables
npm run db:seed          # catalogues (+ the local user when auth is off)
npm run db:studio        # browse
```

## Backups

Supabase's free plan keeps limited backups. Before you have users you can't
afford to lose, upgrade or schedule your own `pg_dump` against `DIRECT_URL`.
