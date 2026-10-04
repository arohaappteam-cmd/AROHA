# Architecture — how the codebase is written

AROHA is one Next.js app: pages, server logic and database access live in
the same repository and deploy together to Vercel. This page explains where
everything is, how a request flows through it, and the rules the code
follows.

**Stack:** Next.js 16 (App Router, Turbopack) · React 19 · TypeScript ·
Tailwind CSS 4 · shadcn/ui on Base UI · Prisma 7 (`@prisma/adapter-pg`) ·
PostgreSQL (Supabase) · Supabase Auth · zod · Vitest · lucide icons.

> Next.js 16 differs from older versions (e.g. `middleware.ts` is now
> `proxy.ts`). Read `node_modules/next/dist/docs/` before changing framework
> code — see `AGENTS.md`.

---

## The layers

```
Browser
  │
  ▼
src/proxy.ts                 refreshes the session, sends signed-out visitors to /login
  │
  ▼
src/app/…/page.tsx           thin route: reads params, calls a service, renders components
  │                          (mutations go through a Server Action instead)
  ▼
src/server/actions/*         Server Actions: re-validate input with zod, call a service
  │
  ▼
src/server/services/*        use cases: business rules, composed from repositories + modules
  │
  ├──► src/modules/*         pure domain logic (no I/O) — rules, catalogues, calculations
  │
  ▼
src/server/repositories/*    data access, one per aggregate (Prisma queries)
  │
  ▼
src/server/db                the Prisma client over a pg pool → PostgreSQL
```

**Dependency direction:** `app → components → server/services →
repositories → db`. `modules/` can be used from anywhere because it never
does I/O. UI code never imports `server/db` or `server/ai` directly.

---

## Folder map

```
aroha/
├─ docs/                      ← you are here (see the index in README.md)
├─ prisma/
│  ├─ schema.prisma           the data model (see docs/DATABASE.md)
│  ├─ migrations/             SQL migrations, applied in order; never edit old ones
│  └─ seed.ts                 loads the skill + achievement catalogues (idempotent)
├─ prisma.config.ts           Prisma CLI config (uses DIRECT_URL for migrations)
├─ public/                    PWA icons (192/512/maskable)
├─ scripts/
│  ├─ vercel-build.mjs        Vercel's build: generate → migrate + seed (production only) → build
│  ├─ set-plan.ts             grant a plan by hand: npm run plan:set -- email pro
│  ├─ backfill-xp.ts          one-off: award XP for completions recorded before the engine existed
│  └─ brand/generate-icons.mjs  renders favicon/app icons/preview image from src/app/icon.svg
├─ src/
│  ├─ proxy.ts                session refresh + sign-in gate (Next 16's "middleware")
│  ├─ instrumentation.ts      logs every server error as one JSON line (+ optional webhook)
│  ├─ app/                    routes only (see "Routes" below)
│  ├─ components/             React components, grouped by feature
│  ├─ config/                 env validation, site constants, navigation
│  ├─ lib/                    tiny shared helpers (cn, action results, browser Supabase client)
│  ├─ modules/                pure domain logic — unit-tested, no database
│  ├─ server/                 server-only code: db, auth, repositories, services, actions, ai
│  ├─ generated/prisma/       Prisma client output (git-ignored, built on install)
│  └─ test/                   test helpers
├─ vercel.json                build command + function region
├─ .env.example               every environment variable, documented
├─ AGENTS.md / CLAUDE.md      instructions for AI coding agents
└─ .agents/ .windsurf/ skills-lock.json   Prisma reference skills for AI coding tools (not app code)
```

### `src/app/` — routes

Every folder is a URL. Pages stay thin: they fetch through a service and
hand data to components.

| Path | What it is |
| --- | --- |
| `layout.tsx` | Root HTML, fonts, metadata, dark theme |
| `globals.css` | Theme tokens and Tailwind setup (see docs/DESIGN.md) |
| `icon.svg`, `favicon.ico`, `apple-icon.png`, `opengraph-image.png`, `manifest.ts` | App icons, link preview, PWA manifest (Next file conventions) |
| `login/`, `reset-password/` | Signed-out pages |
| `auth/confirm/route.ts` | Where email links and Google sign-in return |
| `api/health/route.ts` | `GET /api/health` — uptime check (database ping) |
| `(app)/layout.tsx` | Wraps every signed-in page in the app shell |
| `(app)/page.tsx` | Home — today's quests |
| `(app)/goals`, `skills`, `projects`, `assessments`, `passport`, `character`, `journal`, `journey`, `discover`, `community`, `insights`, `mentor`, `plans` | One folder per section; `loading.tsx` gives each an instant skeleton |
| `(app)/error.tsx`, `global-error.tsx`, `not-found.tsx` | Error and 404 pages |

`(app)` is a route group: it shares a layout without adding to the URL.

### `src/components/` — UI

| Folder | Contents |
| --- | --- |
| `ui/` | shadcn/ui primitives (button, card, dialog, sheet…). Generated — edit sparingly |
| `shell/` | App shell: sidebar (`nav-links`), phone tab bar (`mobile-nav`), logo (`brand`), identity chip, sign-out |
| `common/` | Shared pieces: `glyph` (emoji → icon), page header, empty/error states, page skeleton |
| `plans/` | Plan badge, locked-feature card, upgrade notice, "notify me" button |
| `auth/` | Sign-in form (email + Google), password reset, auth shell |
| `quests/`, `goals/`, `skills/`, `projects/`, `assessments/`, `proof/`, `passport/`, `reflection/`, `experiments/`, `journey/`, `insights/`, `social/`, `character/`, `challenges/`, `streaks/`, `shadow/`, `dashboard/`, `progression/`, `mentor/` | One folder per feature |

Server Components by default; files that need the browser start with
`"use client"`.

### `src/modules/` — domain logic

Pure TypeScript: catalogues, rules and calculations. No database, no
network, so they're fast to unit-test (`*.test.ts` next to the code).

| Module | Owns |
| --- | --- |
| `progression` | Level curve, tiers, attribute weights, XP validity |
| `identity` | Life areas, avatar catalogue & evolution, interests, preferences, schemas |
| `goals` | Goal lifecycle, progress, deadlines, roadmap contract + rule-based generator |
| `quests` | Categories, templates, seeded generator, lessons, payloads, XP pricing |
| `skills` | Skill catalogue, per-skill levels, tree state, quest → skill matching |
| `achievements`, `streaks`, `challenges`, `shadow` | Motivation systems |
| `projects`, `assessments`, `proof` | Making things, testing ability, proof tiers |
| `reflection`, `experiments`, `timeline`, `journey` | Journal, daily reflection, experiments, life timeline, progression map |
| `analytics` | Insights: datasets, trends, patterns with evidence |
| `social` | Guilds, group challenges, matching, leaderboards, mentorship chains |
| `mentor` | AI Mentor prompts, schemas, fallbacks |
| `plans` | Free / Pro / Premium: limits, features, comparison table |
| `auth` | Sign-in form schemas and error messages |

### `src/server/` — server-only code

Every file starts with `import "server-only"`, so it can never be bundled
into the browser.

| Folder | Contents |
| --- | --- |
| `db/` | `index.ts` — the app's Prisma client (pooled, Vercel-aware). `create-client.ts` — factory reused by scripts. `catalogue-cache.ts` — in-memory cache for catalogue reads. `skill-sync.ts`, `achievement-sync.ts` — write catalogues into the database |
| `auth/` | `current-user.ts` — **the one place that decides who the user is**. `supabase.ts` — verified identity from the session. `supabase-admin.ts` — secret-key client used only for account deletion. `redirects.ts` — safe `?next=` handling |
| `repositories/` | Prisma queries, one file per aggregate (goal, quest, skill, plan…) |
| `services/` | Use cases. Each throws its own error class (`GoalError`, `ProjectError`…) for messages that are safe to show |
| `actions/` | Server Actions called by forms and buttons |
| `progression/` | The XP engine: award/revoke XP + attribute gains, idempotently |
| `ai/` | AI provider abstraction (`mock` / `anthropic`), structured output with zod, `aiOrFallback` |

---

## How a typical feature works

**Reading** (e.g. the Goals page): `app/(app)/goals/page.tsx` calls
`getCurrentUser()`, then a service such as `goal-view.service.ts`, which
reads through `goal.repository.ts` and computes progress with
`modules/goals/progress.ts`. The page renders components from
`components/goals/`.

**Writing** (e.g. creating a goal): `components/goals/goal-form.tsx` calls
`createGoalAction` in `server/actions/goal.actions.ts`. The action
re-parses the form with the zod schema in `modules/goals/schemas.ts`, gets
the user, and calls `goal.service.createGoal`, which checks the plan limit,
writes the goal and generates a roadmap. Domain errors come back as
`{ ok: false, error }` and the form shows them; the action then
`revalidatePath`s so pages re-render with fresh data.

### Adding a feature

1. Rules and calculations → a new folder in `src/modules/` with tests.
2. Tables → `prisma/schema.prisma`, then `npm run db:migrate -- --name x`
   (add `ALTER TABLE … ENABLE ROW LEVEL SECURITY` to the migration —
   see docs/AUTH_AND_SECURITY.md).
3. Queries → a repository; use cases → a service.
4. Mutations → a Server Action that validates with zod.
5. UI → `src/app/(app)/<route>/page.tsx` + `loading.tsx` + components.
6. Navigation → `src/config/navigation.ts`.
7. If it belongs to a paid tier → `src/modules/plans/catalogue.ts`.

---

## Engineering rules

- **The backend owns game state.** XP, levels, stats, achievements and
  completion are computed by deterministic code. AI output is validated
  against a zod schema and never written straight into progression tables.
- **Progression is an auditable ledger.** XP and attribute gains are
  append-only rows; level and tier are derived. Every ledger row is unique
  per source, so one action can never pay twice, and undo removes exactly
  what was awarded.
- **One identity resolver.** Only `getCurrentUser()` knows how people sign
  in; everything downstream takes a `userId`. Every user-owned query is
  scoped by `userId`.
- **Never trust input.** Server Actions re-parse every argument with zod,
  even when the form already did.
- **Limits live in services.** Plan limits, lifecycle rules and ownership
  checks are enforced server-side; the UI only reflects them.
- **AI is optional and swappable.** `AI_PROVIDER=mock` (default) runs fully
  offline. Every AI call goes through `aiOrFallback`, which falls back to a
  real deterministic result, and runs only for plans that include AI.
- **Symbols are icons.** Catalogues store an emoji as a symbol key; the UI
  renders it with `<Glyph>` as an SVG icon.

---

## Testing

| Command | What it runs |
| --- | --- |
| `npm test` | Unit tests for `modules/` and other pure code (fast, no database) |
| `npm run test:integration` | Service tests against the database in `.env`, using throwaway users that are deleted afterwards |
| `npm run typecheck` | Route type generation + TypeScript |
| `npm run lint` | ESLint |

Integration tests run files one at a time because they share a database.
The AI mock (`getMockAIProvider().register(...)`) lets tests script model
responses.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Dev server at http://localhost:3000 |
| `npm run build` / `start` | Production build / server |
| `npm run db:migrate` | Create + apply a migration in development |
| `npm run db:deploy` | Apply pending migrations (production) |
| `npm run db:seed` | Load skill + achievement catalogues |
| `npm run db:studio` | Browse the database |
| `npm run plan:set` | Grant a plan: `-- friend@example.com pro`; `-- --interest` lists "notify me" sign-ups |
| `npm run vercel-build` | What Vercel runs |
| `node scripts/brand/generate-icons.mjs` | Re-render icons after editing `src/app/icon.svg` |
