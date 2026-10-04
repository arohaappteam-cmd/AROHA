# Auth and security

How people sign in, how the server knows who they are, and what protects
their data. Setup steps for Supabase and Google are in
[DEPLOYMENT.md](DEPLOYMENT.md).

---

## Sign-in methods

AROHA uses **Supabase Auth**. Two ways in, one account per person:

| Method | How it works |
| --- | --- |
| **Email + password** | Sign up → confirmation email → link → signed in. Password reset by email link. Minimum 8 characters (enforced in the form *and* in Supabase). |
| **Continue with Google** | One tap; Google returns to AROHA with a one-time code. The account's name comes from the Google profile. If the same email already signed up with a password, Supabase links them. |

Both are handled in the browser by `src/components/auth/auth-form.tsx` with
the Supabase client from `src/lib/supabase-browser.ts`. Sign-in requests go
from each visitor's own connection, so Supabase's per-IP brute-force limits
apply per person rather than to the whole site.

Set `AUTH_GOOGLE=off` to hide the Google button.

### Local mode (no sign-in)

With `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
unset — the default for development — there is no sign-in: everyone is one
local user (`handle = "local"`). **Production refuses to start in this mode**
unless `AUTH_MODE=local` is set on purpose (`src/config/env.ts`), so a
missing variable can never make the live site open to everyone as one user.

---

## The flows

### Email confirmation and password reset

```
Sign up (browser) ──► Supabase sends email
Email link ──► /auth/confirm?token_hash=…&type=email ──► verifyOtp ──► session cookie ──► /
Reset link ──► /auth/confirm?token_hash=…&type=recovery ──► /reset-password ──► new password
```

The email templates use `token_hash` links, so they work in any browser or
email app, not only the one that asked.

### Google (OAuth with PKCE)

```
"Continue with Google"
  └─ browser: signInWithOAuth → a code verifier is stored in a cookie
       └─ Google account picker
            └─ Supabase callback (https://<project>.supabase.co/auth/v1/callback)
                 └─ /auth/confirm?code=… ──► exchangeCodeForSession (uses the verifier) ──► /
```

If the person cancels at Google or Google refuses, Supabase returns
`?error=…` and `/auth/confirm` sends them to `/login?error=oauth` with a
friendly message.

### Every request after that

```
src/proxy.ts
  ├─ refreshes the session cookie if needed (Supabase getClaims)
  ├─ signed out + private page  → redirect to /login?next=<page>
  └─ signed in + /login         → redirect to /
src/server/auth/current-user.ts  getCurrentUser()
  ├─ verifies the JWT again (getClaims checks the signature — never getSession)
  ├─ finds the AROHA User by authId, or creates it on first sign-in
  └─ cached per request (React cache), so one lookup per page
```

The proxy is the fast first check; **`getCurrentUser()` checks again on every
page and Server Action**, so nothing relies on the proxy alone. Public paths
are only `/login`, `/auth/*`, `/api/health`, icons and the web manifest.

### Sign-out and account deletion

- **Sign out** is a plain form posting to a Server Action that clears the
  session cookies — it works before JavaScript loads.
- **Delete account** (Character → Customize → Account, typed confirmation):
  `account.service.ts` deletes the User row — everything else cascades
  (journal, goals, quests, XP, community, mentorship notes) — then removes
  the sign-in from Supabase with the secret key. Data goes first because
  it's the sensitive part; if removing the sign-in fails, retrying finishes
  the job. Without `SUPABASE_SECRET_KEY` deletion is refused rather than
  half-done.

---

## Keys and secrets

| Variable | Public? | Used for |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes (in every page) | Talking to Supabase Auth |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes (in every page) | Same — it can't read data (see RLS below) |
| `SUPABASE_SECRET_KEY` | **No — server only** | Removing a sign-in on account deletion. Built per call, never kept, never exported (`supabase-admin.ts`) |
| `DATABASE_URL`, `DIRECT_URL` | **No — server only** | Database connections |
| `ANTHROPIC_API_KEY` | **No — server only** | AI, when enabled |

`src/config/env.ts` validates all of them at startup and refuses obvious
mistakes (e.g. the secret key set to the publishable key). Secrets live only
in `.env` (git-ignored) and in Vercel's environment settings — never in code.

---

## Data protection

### The database can't be read through Supabase's public API

Supabase serves every table over a REST API, and the publishable key that
unlocks it ships to every browser. AROHA never uses that API — the server
connects to Postgres directly as the table owner. The `lock_public_api`
migration turns on **Row Level Security with no policies** on every table,
which closes the REST API completely without affecting the app. Every new
table must do the same in its migration:

```sql
ALTER TABLE "NewTable" ENABLE ROW LEVEL SECURITY;
```

(The `performance_and_plans` migration does this for `PlanInterest`.)
Turning the Data API off in Supabase settings is a second lock.

### Every query is scoped to its owner

Repositories filter by `userId` on every read and write
(`findFirst({ where: { id, userId } })`), so guessing another record's id
returns "doesn't exist". Integration tests check this ("projects that aren't
yours", "a stranger can't read the journal").

### Privacy rules in the product

- **The journal is private.** Only reachable through `journal.service`, never
  on the passport, timeline, community, mentor context, or anything sent to AI.
- **Nothing is shared until the user shares it.** Community profiles are
  PRIVATE by default with per-part toggles; leaderboards are opt-in.
  Private members are counted but never named. Emails are never shown.
- **AI sees the minimum.** Reflection summaries get the reflection and the
  day's quest record only; insight reports get pattern data, never raw notes.

---

## Web security

Sent with every response (`next.config.ts`):

| Header | Effect |
| --- | --- |
| `Content-Security-Policy: frame-ancestors 'none'; form-action 'self'; base-uri 'self'; object-src 'none'` | No clickjacking, no form hijacking, no plugins |
| `X-Frame-Options: DENY` | Older browsers: no framing |
| `X-Content-Type-Options: nosniff` | No MIME sniffing |
| `Referrer-Policy: strict-origin-when-cross-origin` | No full URLs leak to other sites |
| `Permissions-Policy` | Camera, mic, location, payment, USB off |
| `Strict-Transport-Security` | HTTPS only (2 years) |

Also:

- **Safe redirects.** `?next=` is parsed the way a browser would and kept
  only if it stays on this site (`redirects.ts`), so links can't bounce
  people to another domain.
- **Server Actions re-validate input** with zod; IDs and enums are checked,
  lengths are capped.
- **Quiz answers never reach the browser** before a pass; grading is on the
  server.
- **Rate limits:** Supabase limits sign-in and email sends per IP;
  mentorship notes are capped at 30 per hour per person and 5 pending
  requests.
- **Errors don't leak.** Users see a short "Ref" code. Server logs
  (`instrumentation.ts`) record the message and route but never query
  strings (email links carry tokens), cookies, headers or form contents.
  `/api/health` reports only ok / not ok.

---

## Checklist before inviting people

- [ ] Supabase: email confirmation on, min password length 8, custom SMTP
- [ ] Supabase: Data API off; Advisors → Security shows no RLS errors
- [ ] Supabase: Site URL and Redirect URLs set to your domain
- [ ] Google: OAuth app published ("In production"), redirect URI = Supabase callback
- [ ] Vercel: `SUPABASE_SECRET_KEY` set (account deletion works), nothing secret starts with `NEXT_PUBLIC_`
- [ ] Test: sign up, confirm, reset password, Google sign-in, delete a spare account
