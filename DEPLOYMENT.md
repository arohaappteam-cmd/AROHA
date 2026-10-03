# Deploying AROHA — Supabase + Render

Supabase gives AROHA its **database** and **sign-in** (Supabase Auth). Render
**runs the app**. Budget about 45 minutes the first time.

You'll collect four values along the way. Keep them in a password manager,
never in git:

| Value | Where it comes from | Goes into |
| --- | --- | --- |
| `DATABASE_URL` | Supabase → Connect → Session pooler | Render |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Connect → App Frameworks | Render |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → Project Settings → API Keys | Render |
| `SUPABASE_SECRET_KEY` | Supabase → Project Settings → API Keys → Secret keys | Render only |

---

## Part 1 — Supabase

### 1. Create the project

1. Sign in at [supabase.com](https://supabase.com) → **New project**.
2. **Region**: pick the one closest to your users, and use the *same* region
   for Render later. For India, **Southeast Asia (Singapore)** pairs with
   Render's Singapore region.
3. Set a strong **database password** and save it — it goes into
   `DATABASE_URL`.
4. If the creation form offers **"Enable Data API"**, turn it **off**, and if it
   offers **"Enable automatic RLS"**, turn it **on**. (AROHA doesn't use the
   Data API — see step 5.)

### 2. Get the database connection string

1. In the project, click **Connect** (top bar).
2. Choose **Session pooler** — *not* "Direct connection". Render's network is
   IPv4 and Supabase's direct connection is IPv6-only; the session pooler works
   on both and supports migrations.
3. Copy the URI. It looks like:

   ```
   postgresql://postgres.abcdefghij:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres
   ```

4. Replace `[YOUR-PASSWORD]` with your database password, and add
   `?sslmode=require` to the end so the connection is encrypted:

   ```
   postgresql://postgres.abcdefghij:MyStrongPassword@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require
   ```

   That's your **`DATABASE_URL`**. If the password contains `@ : / ? # %`,
   URL-encode those characters (e.g. `@` → `%40`).

   *Optional, stricter:* Project Settings → Database → **SSL configuration** →
   download the certificate, and set its contents as `DATABASE_CA_CERT` on
   Render. AROHA then verifies the database's certificate too.

### 3. Get the API keys

- **Project URL** (`https://abcdefghij.supabase.co`) → `NEXT_PUBLIC_SUPABASE_URL`.
  Shown under **Connect → App Frameworks** (and in Project Settings → Data API).
- From Project Settings → **API Keys**, the **Publishable key** (`sb_publishable_…`) → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  (older projects call it the **anon** key — that works too)

- Also on that page, under **Secret keys**, create (or reveal) a secret key
  (`sb_secret_…`) → `SUPABASE_SECRET_KEY`. It's used for exactly one thing:
  removing someone's sign-in when they delete their account. It bypasses all
  security, so it goes **only** into Render's environment — never into code,
  chat, or any variable starting with `NEXT_PUBLIC_`. Without it, AROHA
  refuses account deletion instead of doing half of it.

### 4. Configure sign-in

1. **Authentication → Sign In / Providers → Email**: enabled, with
   **Confirm email** on.
2. **Authentication → URL Configuration** (fill in after Part 2 if you don't
   know your Render address yet):
   - **Site URL**: `https://YOUR-APP.onrender.com`
   - **Redirect URLs**: add `https://YOUR-APP.onrender.com/auth/confirm`
     and `http://localhost:3000/auth/confirm`
3. **Authentication → Emails → Templates** — so links work on any device
   (phone email app, different browser), change the link in two templates:
   - **Confirm signup**:
     `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`
   - **Reset Password**:
     `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery`
4. **Authentication → Emails → SMTP Settings** — **required before real users
   sign up.** Supabase's built-in email only delivers to your own team's
   addresses and only a few per hour.
   - **No domain yet:** a dedicated Gmail account with 2-Step Verification
     and an **app password** — host `smtp.gmail.com`, port `465`, username and
     sender = that Gmail address. Around 500 emails a day; new senders may land
     in spam at first.
   - **With a domain:** [Resend](https://resend.com), Brevo or Postmark —
     verify the domain's DNS records, then use the provider's SMTP details
     (Resend: `smtp.resend.com`, port `465`, username `resend`, password = an
     API key). Switching later needs no code change.
   - Then **Authentication → Rate Limits → emails sent per hour**: raise from
     the default to e.g. `100`.

### 5. Lock down sign-in

**Authentication → Providers → Email** (or **Authentication → Settings**):

- **Minimum password length**: `8` — matches what AROHA's forms ask for, and
  stops anyone signing up with a shorter one by calling Supabase directly.
- **Password requirements**: at least *Letters and digits*.
- **Secure email change**: on (the default).
- Leave **Phone**, **Anonymous sign-ins** and every social provider **off** —
  AROHA only uses email.
- *Pro plan only:* turn on **Prevent use of leaked passwords**.

**Authentication → Rate Limits**: sign-in, sign-up and password emails go
straight from each visitor's browser, so Supabase's per-IP limits apply per
person. Session refreshes come from Render's one address — if you grow past a
few thousand active users an hour, raise **Token refreshes**.

### 6. Close the Data API

AROHA's server talks to Postgres directly; it never uses Supabase's REST
("Data") API. But that API is on by default and the publishable key is public,
so it must not be able to read your tables.

- The migration `lock_public_api` turns on **Row Level Security** for every
  table (applied automatically on deploy). That alone blocks the API.
- Belt and braces: Project Settings → **Data API** → turn it **off** (or remove
  `public` from **Exposed schemas**).
- After the first deploy, open **Table Editor**: every table should show
  **RLS enabled**. Supabase's **Advisors → Security** should show no
  "RLS disabled" errors.

---

## Part 2 — Render

### 7. Put the code on GitHub

Render deploys from a Git repository. Commit your work and push the branch you
want to deploy (usually `main`) to a **private** GitHub repo. `.env` is
git-ignored — keep it that way.

### 8. Create the web service

**Easiest: Blueprint.** The repo includes `render.yaml`.

1. Render dashboard → **New → Blueprint** → connect GitHub → pick the repo.
2. Render reads `render.yaml` and asks for the four `sync: false` values —
   paste them from Part 1.
3. **Apply**. The first build takes a few minutes.

**Or by hand:** New → **Web Service** → pick the repo, then:

| Setting | Value |
| --- | --- |
| Runtime | Node |
| Region | Same as Supabase (e.g. Singapore) |
| Build command | `npm ci --include=dev && npm run db:deploy && npm run db:seed && npm run build` |
| Start command | `npm start` |
| Health check path | `/api/health` |
| Environment | `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `AI_PROVIDER=mock` |

What the build does: installs packages, applies database migrations
(`db:deploy`), loads the skill and achievement catalogues (`db:seed`, safe to
repeat), then builds the app. Node 24 is pinned by `.node-version`.

**Don't set `NODE_ENV`** on Render — `npm start` sets it, and setting it at
build time skips the tools the build needs.

### 9. Finish the loop

1. Copy the live address from Render (e.g. `https://aroha.onrender.com`, or
   `aroha-xxxx.onrender.com` if the name was taken) → put it in Supabase
   **Site URL** and **Redirect URLs** (step 4). Email links are built from it.
2. Open `https://YOUR-APP.onrender.com/api/health` — you want
   `"status":"ok"` and `"database":{"ok":true,…}`.

---

## Part 3 — Check it works

1. Visit the site → you land on **/login**.
2. **Create an account** → confirmation email arrives → click the link → you're
   signed in on **Home**.
3. Sign out (bottom of the sidebar), sign back in.
4. **Forgot password?** → email → link → choose a new password.
5. Second account (another browser/incognito): in each, Community → **Your
   sharing** → *Visible to the community*. Each should now find the other in
   Community. Turn on *open to mentoring* on one (it needs a skill past level
   3 to be offered as a mentor), ask for mentorship from the other, accept,
   and exchange a note.
6. Supabase → Table Editor → `User`: one row per account, `authId` filled.

---

### 10. Watch it (free)

**Uptime monitor** — also keeps the free plans awake:

1. Sign up at [UptimeRobot](https://uptimerobot.com) (free).
2. **Add New Monitor** → type **HTTP(s)** → URL
   `https://YOUR-APP.onrender.com/api/health` → interval **5 minutes**.
3. Add your email as the alert contact.

You'll get an email if the site or its database goes down. The regular visits
also stop Render's free plan from sleeping (one always-on service fits in the
free 750 hours a month) and keep Supabase's free project from pausing.

**Errors** — every server error is written to **Render → your service →
Logs** as one JSON line. The error page users see shows a short **Ref**
code; search the logs for it to find the exact error. To be pinged in a chat
instead, create an incoming webhook in a Discord channel (Channel settings →
Integrations → Webhooks) or Slack, and add it to Render as
`ERROR_WEBHOOK_URL`. Logs never include query strings, cookies or form
contents.

**Account deletion** — people delete their own account under Character →
Customize → Account. Test it once with a spare account after deploying.

## Updating later

- **Code**: push to the deployed branch → Render rebuilds and runs any new
  migrations automatically.
- **New tables**: give each new table RLS in its migration
  (`ALTER TABLE "X" ENABLE ROW LEVEL SECURITY;`), or keep the Data API off.
- **Backups**: Supabase's free plan keeps limited backups; upgrade, or schedule
  your own `pg_dump`, before you have users you can't afford to lose.

## Free-tier limits to know

- **Render free** sleeps after ~15 minutes without traffic; the next visit
  takes up to a minute to wake. The paid Starter plan stays on.
- **Supabase free** pauses a project after a week with no activity, and caps
  the database at 500 MB.

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| Build fails at `db:deploy` with a connection error | `DATABASE_URL` uses the Direct connection (IPv6) — use the **Session pooler** string |
| `password authentication failed` | Wrong password, or special characters not URL-encoded |
| `self-signed certificate in certificate chain` | `sslmode` other than `require` without `DATABASE_CA_CERT` — use `?sslmode=require` |
| App shows "Invalid environment configuration" | A Supabase variable is missing or misspelled on Render |
| Sign-up email never arrives | Custom SMTP not set up (step 4), or check Authentication → Logs |
| Email link says "expired or already used" | Link opened twice, or Redirect URLs missing `/auth/confirm` |
| Health check shows `"database":{"ok":false}` | Database paused (Supabase free) or wrong `DATABASE_URL` |
