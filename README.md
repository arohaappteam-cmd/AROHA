# AROHA

AI-powered real-life personal growth and progression system. The product vision
lives in [AROHA_Master_Product_Specification-1.md](AROHA_Master_Product_Specification-1.md).

**Current state: Phase 5 — progression engine.**

| Phase | Scope | Status |
| ----- | ----- | ------ |
| 0 | Foundation: shell, database, data layer, AI provider abstraction | Done |
| 1 | Profile, character & avatar, interests, life areas & focus, preferences, character dashboard | Done |
| 2 | Goals → milestones → missions, roadmap generation & editor, goal lifecycle | Done |
| 3 | Daily quests: generation, today's journey, quest lifecycle, learning architecture | Done |
| 4 | AI Mentor: Claude provider, AI quest/roadmap/discovery generation, insights, graceful fallback | Done |
| 5 | Progression: XP ledger, levels, attributes, level-up moments, XP history | Done |
| — | Achievements, streaks, skill trees, end-of-day reflection, social | Not started |

Routes: `/` (today's journey), `/quests/[questId]`, `/character`,
`/character/edit`, `/goals` (`?view=completed|archived`), `/goals/new`,
`/goals/[goalId]`, `/goals/[goalId]/edit`, `/mentor`, `/api/health`.

## AI Mentor

Off by default. To turn it on, set `AI_PROVIDER=anthropic` and `ANTHROPIC_API_KEY`
in `.env` (optionally `AI_MODEL`, default `claude-opus-5`). With no key the app
runs unchanged on deterministic fallbacks — nothing breaks, it's just less
personalised.

- **Service layer only.** UI never calls the model. Everything goes through
  `src/server/ai` (`getAIProvider` → `generateStructured` → `aiOrFallback`).
- **Structured outputs, always validated.** Each task names a zod schema; the
  Claude provider constrains output to it (`messages.parse` + `zodOutputFormat`)
  and `generateStructured` re-validates. Invalid output is rejected and the
  caller falls back.
- **The AI generates; the backend owns game state (spec §6).** AI never sets XP,
  levels, stats, achievements, ids or goal linkage. The AI quest generator only
  rewords the four non-goal core quests; the goal quest, carry-overs, payloads
  and XP stay deterministic. The AI roadmap generator's output is re-validated
  and its milestones/missions are persisted by the backend.
- **Fallbacks are real, not fake AI.** When AI is unavailable, quests and
  roadmaps come from the rule-based generators and mentor insights from a
  transparent heuristic — never a hard-coded "AI response".

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind CSS 4 ·
shadcn/ui (Base UI) · Prisma 7 (`@prisma/adapter-pg`) · PostgreSQL · zod · Vitest

## Getting started

```bash
cp .env.example .env        # set DATABASE_URL
npm install                 # also runs `prisma generate`
npm run db:migrate          # apply migrations
npm run db:seed             # optional: create the local user
npm run dev                 # http://localhost:3000
```

| Script              | Purpose                                      |
| ------------------- | -------------------------------------------- |
| `npm run dev`       | Dev server                                   |
| `npm run build`     | Production build                             |
| `npm run typecheck` | Route typegen + `tsc --noEmit`               |
| `npm run lint`      | ESLint                                       |
| `npm test`          | Unit tests (Vitest)                          |
| `npm run test:integration` | Service tests against the database in `.env` (uses throwaway users) |
| `npm run db:*`      | `generate`, `migrate`, `deploy`, `seed`, `studio` |

Health check: `GET /api/health` → database connectivity + AI provider.

## Architecture

```
prisma/                   schema, migrations, seed
src/
  app/                    routes only — thin pages, loading/error/not-found
    (app)/                routes rendered inside the app shell
    api/health/           health route handler
  components/
    ui/                   shadcn/ui primitives (generated)
    shell/                app shell, sidebar + mobile navigation
    common/               page header, empty/error states
    dashboard/            home dashboard sections
    character/            character avatar + dashboard cards
      edit/               client editors for the customize page
  config/                 env validation (server), site constants, navigation
  modules/                pure domain logic — no I/O, unit-tested
    progression/          level curve, tiers, attributes
    identity/             life areas, avatar catalogue & evolution, interests,
                          preferences, zod input schemas, setup progress
    goals/                lifecycle rules, progress & next step, deadlines,
                          roadmap contract + rule-based generator, schemas
    quests/               categories, generation context & draft contract,
                          templates, seeded generator, learning providers +
                          lesson library, payloads, rewards, status rules
  server/progression/     port the XP engine will implement (no-op for now)
    analytics/            aggregations over progression data
  server/                 server-only code
    db/                   Prisma client (singleton + factory)
    auth/                 current-user resolver (single local user for now)
    repositories/         data access, one per aggregate
    services/             use cases composed from repositories + modules
    actions/              Server Actions — validate input, call services
    ai/                   provider abstraction, structured-output validation
  generated/prisma/       Prisma client output (git-ignored)
```

Dependency direction: `app → components → server/services → repositories → db`,
with `modules/` usable from anywhere. UI never imports `server/db` or
`server/ai` directly.

### Rules that matter

- **Backend owns game state.** XP, levels, stats, achievements and quest
  completion are computed deterministically. AI output is validated with zod
  (`generateStructured`) and never written straight into progression tables.
- **Progression is auditable.** XP and attribute gains are append-only ledgers
  (`XpTransaction`, `StatTransaction`). Level and tier are derived.
  `XpTransaction` is unique per `(sourceType, sourceId)`, so one action can't
  award XP twice.
- **Single user, multi-user-ready.** Every user-owned row has `userId`.
  `getCurrentUser()` is the only place that decides who the user is.
- **Identity is data, progression is earned.** The user chooses name, avatar
  style/colour/emblem, interests, life areas, focus (max 3) and preferences.
  Level, tier and avatar evolution (rings, glow, sparks) are derived from XP
  and can't be set directly. The five core life areas are always active.
- **Roadmaps have one contract, many authors.** `roadmapDraftSchema`
  (`modules/goals/roadmap.ts`) is the shape every generator must return — the
  rule-based templates now, the AI Mentor later via `generateStructured`. The
  service validates the draft, writes milestones/missions with a `source`
  (USER / TEMPLATE / AI) and records a `RoadmapRevision` snapshot. To plug in
  AI, implement `RoadmapGenerator` and return it from `roadmapGenerator()` in
  `goal.service.ts`.
- **Progress is derived.** Milestone status follows its missions; goal progress
  is completed ÷ non-skipped missions. Nothing is typed in by hand.
- **One day, generated once.** `ensureTodaySet` creates the user's quest set
  on the first visit of their calendar day (their timezone) and never again:
  `DailyQuestSet` is unique per (user, date) and `Quest` per (set, slot), so
  refreshes and concurrent loads can't duplicate anything. Generation is
  seeded by user + date + slot, so it's reproducible.
- **Five core slots, always.** PHYSICAL, MENTAL, LEARNING, SOCIAL and
  PERSONAL_GOAL, plus one optional side quest for a creativity/experiences
  focus. The goal slot follows the major goal's next mission.
- **Quest generators share a contract.** Rule-based templates implement
  `QuestGenerator` (`modules/quests/context.ts`); an AI generator will too.
  Drafts are validated with `questDraftSchema`; XP is priced by the backend
  (`questXpReward`), never by the generator.
- **Learning plugs in.** Learning quests can reference a lesson through a
  `LearningExperienceProvider`. The bundled `library` provider serves curated
  micro-lessons; a `mentor` provider will serve AI-generated ones.
- **Flexible, never punitive (spec §55).** Energy check-ins regenerate
  untouched quests; skipping asks what got in the way; "Tomorrow" carries a
  quest to the next day once; unfinished quests simply expire.
- **Progression is deterministic and auditable.** Quest completed → backend
  validates → XP transaction written → total XP, level and attributes
  recalculated (spec §6). Totals are never stored as bare numbers: they're
  summed from the append-only `XpTransaction` / `StatTransaction` ledger, so
  every point traces back to a real action and undo reverses cleanly.
  - **Never double-pays.** `XpTransaction` is unique per `(sourceType,
    sourceId)`, so completing twice, refreshing, or two concurrent submits
    can only ever produce one award.
  - **Invalid XP is refused.** Negative, zero, fractional and absurd amounts
    are rejected before anything is written (`isAwardableXp`).
  - **Attributes follow life areas.** Each award splits across attributes by
    fixed weights that sum to exactly the XP (`attributeAwards`) — progression
    indicators, not measurements of a person.
  - Completions recorded before the engine existed can be granted with
    `npm run db:backfill-xp` (idempotent).
- **Goals are never deleted from the UI.** Archive hides a goal and makes it
  read-only; restore brings it back.
- **Server Actions never trust their input.** Every action re-parses its
  arguments with the zod schemas in `modules/identity/schemas.ts`.
- **AI provider is swappable.** `AI_PROVIDER` selects the implementation.
  Only `mock` exists. It returns data only for tasks that register a handler,
  and fails loudly for anything else.
