# Roadmap — what's next

Everything built so far is in [FEATURES.md](FEATURES.md). This is the plan
from here, roughly in order. Spec references (§N) point to
[PRODUCT_SPEC.md](PRODUCT_SPEC.md).

---

## Now — launch to friends

- [ ] Deploy (checklist in [DEPLOYMENT.md](DEPLOYMENT.md#launch-checklist))
- [ ] Custom SMTP for sign-up emails (Gmail app password or Resend)
- [ ] Uptime monitor on `/api/health`
- [ ] Invite a first group; give a few people Pro with `npm run plan:set`
- [ ] Watch `PlanInterest` (`npm run plan:set -- --interest`) to see which
      tier people want before building payments
- [ ] Collect feedback: what they open daily, where they get stuck

## Next — payments (turn "coming soon" into real plans)

The plan logic, limits and gating already exist; payments only need to set
`User.plan`.

- Pick a provider. For India: **Razorpay Subscriptions** (UPI, cards,
  local) or **Stripe**; a merchant of record (Paddle, Lemon Squeezy) also
  handles tax for international buyers.
- Checkout from `/plans` → provider → webhook route
  (`src/app/api/billing/webhook/route.ts`) that verifies the signature and
  updates `User.plan` / `planUpdatedAt`.
- A `Subscription` table (provider ids, status, renewal date) and a
  "Manage billing" link on `/plans`.
- Set prices in `src/modules/plans/catalogue.ts` (`price`), flip
  `available: true`.
- Email everyone in `PlanInterest` when it launches.
- Move Vercel to the **Pro** plan (Hobby is non-commercial) and review
  Supabase limits.

## Next — AI Mentor (Premium)

The AI layer, prompts (`modules/mentor`) and plan gating are in place; the
page is switched off.

- Turn on `AI_PROVIDER=anthropic` with a key; AI already runs only for
  Premium accounts.
- Build the `/mentor` conversation UI on `mentor.service.ts`; keep its
  context free of the journal.
- Per-user monthly AI usage limits and cost tracking.
- AI-generated lessons (the `mentor` learning provider) and skill paths
  (new skill trees as data).

## Later — product (from the spec)

| Feature | Spec | Notes |
| --- | --- | --- |
| Skill gap analysis | §26 | Compare a goal's required skills with current levels; suggest the next one |
| Habits | §28 | Recurring user-defined habits that feed quests and streaks (without becoming a habit tracker) |
| Life direction discovery | §40 | Guided exploration that proposes experiments |
| AI life analysis | §38 | Long-horizon review across areas (Premium) |
| Reminders | — | Optional daily email or push ("today's quests are ready", reflection nudge) |
| Download my data | — | Export everything a person owns as JSON |
| Shareable passport | — | A public, opt-in Skill Passport link |
| Light theme | — | Same black-and-white rule, inverted |
| Languages | — | Hindi and others |

## Later — platform

- **CI**: GitHub Actions running lint, typecheck, unit and integration
  tests (against a Postgres service) on every pull request.
- **End-to-end tests** (Playwright) for sign-up, Google sign-in, quests,
  plans.
- **Error monitoring** (e.g. Sentry) alongside the JSON logs; privacy-
  friendly analytics (e.g. Vercel Analytics).
- **Rate limiting** on Server Actions (per user), beyond Supabase's
  sign-in limits.
- **Admin page** for plans and interest instead of the CLI script.
- **Backups**: scheduled `pg_dump` or Supabase Pro point-in-time recovery.
- **Custom domain** with its own email sender domain.
- **Offline support** for the installed app (service worker).

## Deliberately not now (spec §50)

Job or opportunity marketplace, organisation/company accounts, complex
multiplayer, a mentorship marketplace. The individual AROHA experience comes
first.
