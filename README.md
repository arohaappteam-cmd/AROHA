# AROHA

**Turn everyday life into an evolving RPG.** AROHA gives you five small
quests a day across body, mind, learning, people and your goals, and turns
what you actually do into XP, levels, skills, proof and a record of your
growth — alone or with friends.

Built with Next.js 16, React 19, TypeScript, Tailwind CSS 4, Prisma 7,
PostgreSQL and Supabase Auth. Deploys to Vercel.

**Status:** launch-ready. Real accounts (email + Google), a live community,
and Free / Pro / Premium plans — paid tiers are "coming soon" and no
payments exist yet. The AI Mentor is part of Premium and also coming soon.

---

## Documentation

| Doc | Read it for |
| --- | --- |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | **Launching:** GitHub, Supabase, Google sign-in, Vercel — step by step, with a checklist |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | How the codebase is organised: every folder, the layers, how to add a feature |
| [docs/AUTH_AND_SECURITY.md](docs/AUTH_AND_SECURITY.md) | Sign-in flows, sessions, secrets, data protection, security headers |
| [docs/DATABASE.md](docs/DATABASE.md) | The data model, design rules, performance tuning, migrations |
| [docs/FEATURES.md](docs/FEATURES.md) | Everything that's built, every route, how each system behaves, plans |
| [docs/DESIGN.md](docs/DESIGN.md) | The black-and-white colour rule, icons, logo, navigation |
| [docs/ROADMAP.md](docs/ROADMAP.md) | What's next: payments, AI Mentor, features from the spec |
| [docs/PRODUCT_SPEC.md](docs/PRODUCT_SPEC.md) | The original product vision (cited in code as "spec §N") |

---

## Run it locally

Needs Node.js 24 and PostgreSQL.

```bash
cp .env.example .env     # set DATABASE_URL to your local database
npm install              # also generates the Prisma client
npm run db:migrate       # create the tables
npm run db:seed          # skill + achievement catalogues
npm run dev              # http://localhost:3000
```

Without Supabase keys in `.env` there's no sign-in — you're a single local
user. Add `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to try real accounts locally.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run typecheck` | Route types + TypeScript |
| `npm run lint` | ESLint |
| `npm test` | Unit tests |
| `npm run test:integration` | Service tests against the database in `.env` |
| `npm run db:migrate` / `db:deploy` / `db:seed` / `db:studio` | Database |
| `npm run plan:set -- <email> <free\|pro\|premium>` | Grant a plan by hand |

## Project layout

```
docs/        documentation
prisma/      schema, migrations, seed
scripts/     Vercel build, plan grants, icon generation
src/app/     routes (pages, loading states, auth callback, health check)
src/components/  UI, grouped by feature
src/modules/     pure domain logic (rules, catalogues) — unit-tested
src/server/      database, auth, repositories, services, Server Actions, AI
```

Details in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
