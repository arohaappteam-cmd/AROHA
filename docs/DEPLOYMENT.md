# Launching AROHA — GitHub + Supabase + Vercel

**GitHub** holds the code. **Supabase** gives AROHA its database and sign-in
(email + Google). **Vercel** builds the code from GitHub and runs the site.
Budget about an hour the first time.

## Launch checklist

Do these in order; each links to its detailed steps below.

1. [ ] **Code on GitHub** — create a private repo and push (step 8)
2. [ ] **Supabase project** — create it, copy two connection strings and the API keys (steps 1–3)
3. [ ] **Email sign-in** — confirm-email on, link templates, SMTP (step 4)
4. [ ] **Google sign-in** — Google OAuth client → paste into Supabase (step 5)
5. [ ] **Vercel** — import the GitHub repo, add 6 environment variables, deploy (step 9)
6. [ ] **Connect the domain back** — Vercel URL into Supabase and Google (steps 6 and 10)
7. [ ] **Test** — sign up, Google, reset password, plans (Part 3)
8. [ ] **Share** — send friends the link; grant Pro to anyone you like (Plans section)
9. [ ] **Monitor** — free uptime check on `/api/health` (step 11)

From then on, every `git push` to `main` redeploys automatically.

---

You'll collect these values along the way. Keep them in a password manager,
never in git:

| Value | Where it comes from | Goes into |
| --- | --- | --- |
| `DATABASE_URL` | Supabase → Connect → **Transaction pooler** (port 6543) | Vercel |
| `DIRECT_URL` | Supabase → Connect → **Session pooler** (port 5432) | Vercel |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Connect → App Frameworks | Vercel |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → Project Settings → API Keys | Vercel |
| `SUPABASE_SECRET_KEY` | Supabase → Project Settings → API Keys → Secret keys | Vercel only |
| Google Client ID + Secret | Google Cloud → Google Auth Platform → Clients | Supabase only |

---

## Part 1 — Supabase

### 1. Create the project

1. Sign in at [supabase.com](https://supabase.com) → **New project**.
2. **Region**: closest to your users. For India, **Southeast Asia
   (Singapore)** or **South Asia (Mumbai)**. Vercel will run in the matching
   region (step 9) — keeping the two together is the single biggest speed win.
3. Set a strong **database password** and save it.
4. If the form offers **"Enable Data API"**, turn it **off**; if it offers
   **"Enable automatic RLS"**, turn it **on**. (AROHA doesn't use the Data
   API — see step 7.)

### 2. Get the two database connection strings

Click **Connect** (top bar). You need two of the pooler strings:

- **Transaction pooler** (port **6543**) → `DATABASE_URL`. The app uses this:
  every Vercel function instance opens a few short-lived connections, and the
  transaction pooler multiplexes them onto a handful of real ones.
- **Session pooler** (port **5432**) → `DIRECT_URL`. Migrations and seeding
  use this, because they need a session the transaction pooler can't give.
  (Supabase's "Direct connection" is IPv6-only, which Vercel's build doesn't
  support — use the session pooler.)

For **both**, replace `[YOUR-PASSWORD]` and add `?sslmode=require`. Copy
the host exactly as Supabase shows it: it names your project's region (e.g.
`aws-0-ap-northeast-2…` for Seoul), and the username carries your project
ID (`postgres.abcdefghij…`). A wrong region fails with "tenant/user not
found".

```
DATABASE_URL=postgresql://postgres.abcdefghij:MyStrongPassword@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require
DIRECT_URL=postgresql://postgres.abcdefghij:MyStrongPassword@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require
```

If the password contains `@ : / ? # %`, URL-encode them (e.g. `@` → `%40`).

*Optional, stricter:* Project Settings → Database → **SSL configuration** →
download the certificate and set its contents as `DATABASE_CA_CERT` on
Vercel. AROHA then verifies the database's certificate too.

### 3. Get the API keys

- **Project URL** (`https://abcdefghij.supabase.co`) → `NEXT_PUBLIC_SUPABASE_URL`.
- Project Settings → **API Keys** → **Publishable key** (`sb_publishable_…`)
  → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (older projects: the **anon** key).
- Same page → **Secret keys** → create one (`sb_secret_…`) →
  `SUPABASE_SECRET_KEY`. It's used for exactly one thing: removing someone's
  sign-in when they delete their account. It bypasses all security, so it goes
  **only** into Vercel's environment — never into code, chat, or a variable
  starting with `NEXT_PUBLIC_`.

### 4. Configure email sign-in

1. **Authentication → Sign In / Providers → Email**: enabled, **Confirm
   email** on, **Minimum password length** `8`, password requirements *Letters
   and digits*.
2. **Authentication → Emails → Templates** — so links work on any device,
   change the link in two templates:
   - **Confirm signup**:
     `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`
   - **Reset Password**:
     `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery`
3. **Authentication → Emails → SMTP Settings** — **required before friends
   sign up.** Supabase's built-in email only reaches your own team and sends a
   few per hour.
   - **No domain yet:** a dedicated Gmail with 2-Step Verification and an
     **app password** — host `smtp.gmail.com`, port `465`, username and sender
     = that address. ~500 emails/day.
   - **With a domain:** [Resend](https://resend.com), Brevo or Postmark
     (Resend: `smtp.resend.com`, port `465`, username `resend`, password = an
     API key).
   - Then **Authentication → Rate Limits → emails sent per hour** → e.g. `100`.

Google sign-in (step 5) needs no email at all, so friends who use it can get
in even before SMTP is set up.

### 5. Configure Google sign-in

**In Google Cloud** ([console.cloud.google.com](https://console.cloud.google.com)):

1. Create a project (e.g. "AROHA").
2. **Google Auth Platform** (formerly "OAuth consent screen") → **Get started**:
   - App name **AROHA**, your support email, audience **External**.
   - **Branding → Authorized domains**: add your project's own Supabase
     domain, `abcdefghij.supabase.co` (the host of `NEXT_PUBLIC_SUPABASE_URL`).
     Plain `supabase.co` and `vercel.app` are rejected ("must be a top
     private domain") because they're shared public suffixes. Add your own
     custom domain here too if you get one later.
   - **Data access**: the defaults (`openid`, `email`, `profile`) are all AROHA
     asks for. These are non-sensitive, so no Google verification is needed.
   - **Audience → Publish app** → *In production*. While it says *Testing*,
     only people you list as test users can sign in.
3. **Clients → Create client** → **Web application**:
   - **Authorized JavaScript origins**: leave empty — Supabase runs the Google
     exchange on its side, so only the redirect URI matters.
   - **Authorized redirect URIs**: the **Callback URL** Supabase shows on its
     Google provider page — `https://abcdefghij.supabase.co/auth/v1/callback`
   - Create, then copy the **Client ID** and **Client secret**.

**In Supabase:** **Authentication → Sign In / Providers → Google** → enable,
paste the Client ID and Client secret, save.

A person who signs in with Google gets an AROHA account named from their
Google profile. If they already signed up with the same email, Supabase links
the two.

To hide the Google button (e.g. before this is set up), set `AUTH_GOOGLE=off`
on Vercel.

### 6. URL configuration

**Authentication → URL Configuration** (fill in after Part 2 if you don't
know your Vercel address yet):

- **Site URL**: `https://YOUR-APP.vercel.app`
- **Redirect URLs**: `https://YOUR-APP.vercel.app/**` and
  `http://localhost:3000/**`

Email links and Google sign-in both return to `/auth/confirm` on this site.

### 7. Lock down the Data API

AROHA's server talks to Postgres directly; it never uses Supabase's REST
("Data") API. But that API is on by default and the publishable key is
public, so it must not be able to read your tables.

- The migrations turn on **Row Level Security** for every table (applied
  automatically on deploy). That alone blocks the API.
- Belt and braces: Project Settings → **Data API** → turn it **off**.
- After the first deploy, **Advisors → Security** should show no
  "RLS disabled" errors.

Leave **Phone** and **Anonymous sign-ins** off. *Pro plan only:* turn on
**Prevent use of leaked passwords**.

---

## Part 2 — GitHub and Vercel

### 8. Put the code on GitHub

Vercel deploys whatever is on your GitHub repository's `main` branch.

1. **Create the repository** at [github.com/new](https://github.com/new):
   name `aroha`, visibility **Private**, and leave *"Add a README"*,
   *.gitignore* and *license* **unticked** (the project already has them).
   Click **Create repository** and copy its URL
   (`https://github.com/YOUR-NAME/aroha.git`).
2. **Bring `main` up to date** with the latest work (from the project folder):

   ```bash
   git checkout main
   git merge --ff-only phase-14-launch
   ```

3. **Connect and push:**

   ```bash
   git remote add origin https://github.com/YOUR-NAME/aroha.git
   git push -u origin main
   ```

   The first push opens a GitHub sign-in window (Git Credential Manager).
   If it asks for a password in the terminal instead, use a
   [personal access token](https://github.com/settings/tokens) with *repo*
   access, not your GitHub password.
4. Refresh the repo page on GitHub — you should see `src/`, `prisma/`,
   `docs/` and the README. **`.env` must not be there** (it's git-ignored;
   it holds your local database password).

Later changes: commit, then `git push`. Vercel redeploys on every push to
`main`; pushes to other branches get their own preview URLs.

### 9. Import the project

1. [vercel.com](https://vercel.com) → **Add New → Project** → import the repo.
2. Framework: **Next.js** (detected). Leave the build settings alone —
   `vercel.json` sets the build command.
3. **Environment Variables** — add these for **Production** and **Preview**:

   | Name | Value |
   | --- | --- |
   | `DATABASE_URL` | transaction pooler string (port 6543) |
   | `DIRECT_URL` | session pooler string (port 5432) |
   | `NEXT_PUBLIC_SUPABASE_URL` | from step 3 |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | from step 3 |
   | `SUPABASE_SECRET_KEY` | from step 3 |
   | `AI_PROVIDER` | `mock` |
   | `AUTH_GOOGLE` | `off` until Google is set up (step 5), then `on` |
   | `SITE_URL` | the address people visit, e.g. `https://arohalos.vercel.app` |

4. **Deploy**. The first build takes a few minutes.

What a **production** build does (`scripts/vercel-build.mjs`): generates the
Prisma client, applies pending migrations, refreshes the skill and
achievement catalogues (safe to repeat), then builds. **Preview** builds skip
the migrations, so an unmerged branch can never change the live database.

**Region.** `vercel.json` runs functions in `icn1` (Seoul), matching AROHA's
Supabase project. If you ever move the database, change it to match, then
redeploy:

| Supabase region | Vercel region |
| --- | --- |
| Northeast Asia (Seoul) `ap-northeast-2` | `icn1` |
| Southeast Asia (Singapore) `ap-southeast-1` | `sin1` |
| South Asia (Mumbai) `ap-south-1` | `bom1` |
| US East (N. Virginia) `us-east-1` | `iad1` |
| EU Central (Frankfurt) `eu-central-1` | `fra1` |
| EU West (London) `eu-west-2` | `lhr1` |

Every page makes several database queries; with the app and database in the
same city each takes about a millisecond instead of a hundred.

**Node** 24 is pinned by `package.json` (`engines`).

### 10. Finish the loop

1. Copy the production address (e.g. `https://aroha.vercel.app`) into
   Supabase **Site URL** and **Redirect URLs** (step 6). Google needs no
   change — it only ever talks to Supabase's callback URL.
2. Open `https://YOUR-APP.vercel.app/api/health` — you want `"status":"ok"`
   and `"database":{"ok":true,…}`.

---

## Part 3 — Check it works

1. Visit the site → you land on **/login**.
2. **Continue with Google** → pick an account → you're on **Home**.
3. Sign out (bottom of the sidebar, or **More** on a phone). **Create an
   account** with email → confirmation email → link → signed in.
4. **Forgot password?** → email → link → choose a new password.
5. Second account (another browser): in each, Community → **Your sharing**
   → *Visible to the community*. Each should find the other in Community.
6. **Plans** (sidebar): both accounts show **Free**. Tap **Notify me** on Pro.
7. Supabase → Table Editor → `User`: one row per account, `authId` filled.

---

## Plans: Free, Pro, Premium

Everyone starts on **Free**. **Pro** and **Premium** are shown as *coming
soon*: payments aren't built, so nothing can be bought and nothing is
charged. What each tier includes is defined in
`src/modules/plans/catalogue.ts` (limits, features, prices — a `null` price
shows as "Coming soon").

**Giving someone Pro or Premium** (e.g. friends in the beta), either:

- Supabase → **Table Editor → User** → find their row → set `plan` to `PRO`
  or `PREMIUM`; or
- from your computer, with `DIRECT_URL` in `.env` pointing at production:

  ```bash
  npm run plan:set -- friend@example.com pro
  ```

**Who asked to be notified** when paid plans launch:

```bash
npm run plan:set -- --interest
```

(or Table Editor → `PlanInterest`).

When you do switch on payments, note that Vercel's free **Hobby** plan is
for non-commercial use — move to Vercel **Pro** before charging anyone.

---

## Sharing with friends

Send them the production URL. They can sign in with Google in one tap, or
create an email account. On a phone, **Share → Add to Home Screen** installs
AROHA like an app (icon and name come from the web manifest). Links shared in
WhatsApp, iMessage or Slack unfurl with AROHA's preview card.

---

### 11. Watch it (free)

**Uptime monitor** — also keeps Supabase's free project from pausing:

1. [UptimeRobot](https://uptimerobot.com) → **Add New Monitor** → HTTP(s) →
   `https://YOUR-APP.vercel.app/api/health` → every **5 minutes**.
2. Add your email as the alert contact.

**Errors** — every server error is written to **Vercel → your project →
Logs** as one JSON line. The error page shows a short **Ref** code; search
the logs for it. To be pinged in a chat, add a Discord or Slack incoming
webhook as `ERROR_WEBHOOK_URL`. Logs never include query strings, cookies or
form contents.

**Account deletion** — people delete their own account under Character →
Customize → Account. Test it once with a spare account.

## How the database is tuned

Pooling, indexes, the `totalXp` rollup and the catalogue cache are explained
in [DATABASE.md](DATABASE.md#performance).

## Updating later

- **Code**: push to `main` → Vercel builds, migrates and deploys.
- **New tables**: enable RLS in the migration
  (`ALTER TABLE "X" ENABLE ROW LEVEL SECURITY;`).
- **Backups**: Supabase's free plan keeps limited backups; upgrade, or
  schedule your own `pg_dump`, before you have users you can't lose.

## Free-tier limits to know

- **Vercel Hobby**: non-commercial use; generous limits for a friends beta.
- **Supabase free** pauses a project after a week without activity (the
  uptime monitor prevents this) and caps the database at 500 MB.

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| `tenant/user postgres.… not found` | Pooler host is for the wrong region, or the username lacks the project ID — copy both strings exactly from Supabase → Connect |
| Build fails at `prisma migrate deploy` | `DIRECT_URL` missing, or set to the transaction pooler (6543) — use the **session pooler** (5432) |
| `password authentication failed` | Wrong password, or special characters not URL-encoded |
| `self-signed certificate in certificate chain` | `sslmode` other than `require` without `DATABASE_CA_CERT` — use `?sslmode=require` |
| App shows "Invalid environment configuration" | A variable is missing or misspelled on Vercel (check it's set for that environment) |
| `prepared statement … already exists` | `DATABASE_URL` points at something other than Supabase's pooler with custom settings — use the transaction pooler string as given |
| Google button shows an error page from Supabase | Google provider not enabled in Supabase (step 5), or set `AUTH_GOOGLE=off` |
| Google says `redirect_uri_mismatch` | Google client's redirect URI must be Supabase's callback URL, exactly |
| After Google, back on /login with an error | Site URL / Redirect URLs in Supabase don't include this domain (step 6) |
| Sign-up email never arrives | Custom SMTP not set up (step 4), or check Authentication → Logs |
| Email link says "expired or already used" | Link opened twice, or Redirect URLs missing this domain |
| Health check shows `"database":{"ok":false}` | Database paused (Supabase free) or wrong `DATABASE_URL` |
| Pages slow (~1 s) | Vercel region doesn't match Supabase region (step 9) |
