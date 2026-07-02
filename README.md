# Vigil

**Visual & code regression testing for the Digital Treasury fleet.**
Vigil captures your clients' valuable pages (full-page screenshots, served HTML, rendered DOM, Lighthouse scores), stores an accepted-good **baseline**, and on every **run** diffs the new capture against it — so the team finds breakage before the client does.

Built from the design doc in `design-doc-implementation-for-claude/` (Claude Design handoff).

## What's inside

- **Next.js 15 + TypeScript** — UI and API in one app
- **SQLite** (better-sqlite3) — all state in a single `vigil.db`
- **Playwright / Chromium** — full-page captures at desktop (1440) and mobile (390) viewports
- **pixelmatch** — visual diffs with the magenta highlight overlay, mask-region support
- **Lighthouse** — Performance / Accessibility / Best Practices / SEO per capture (optional per client)
- **Google SSO** — restricted to the `digitaltreasury.com.au` workspace
- **Scheduler** — per-client daily/weekly runs, Australia/Melbourne timezone
- **Email notifications** — via any SMTP provider
- **Ask Claude** — manual severity assessment of a flagged diff (Anthropic API)

Data lives on disk: SQLite DB + capture files under `/data` (Docker volume) or `./data` (local dev).

---

## Deploy (Docker on a VPS)

Any small VPS works (2 GB RAM recommended — Chromium and Lighthouse are the hungry parts).

### 1. Get the code onto the server

```bash
git clone <this-repo> vigil && cd vigil
cp .env.example .env
```

### 2. Create the Google OAuth client

1. [Google Cloud Console](https://console.cloud.google.com/) → create/select a project
2. **APIs & Services → OAuth consent screen** — Internal (your Workspace), app name "Vigil"
3. **APIs & Services → Credentials → Create credentials → OAuth client ID → Web application**
   - Authorised redirect URI: `https://YOUR-DOMAIN/api/auth/callback`
4. Copy the client ID + secret into `.env`

### 3. Fill in `.env`

```bash
openssl rand -hex 32   # → AUTH_SECRET
```

Set `APP_URL`, `AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.
SMTP settings are optional — without them everything works except notification emails (Resend, Postmark, or Google Workspace SMTP relay all work).

### 4. Start it

```bash
docker compose up -d --build
```

Vigil listens on port 3000. Put your reverse proxy of choice in front for TLS, e.g. [Caddy](https://caddyserver.com/):

```
vigil.digitaltreasury.com.au {
    reverse_proxy localhost:3000
}
```

### 5. First-run setup (in the app)

1. Sign in with a `@digitaltreasury.com.au` Google account
2. **Settings** → paste the Anthropic API key (powers "Ask Claude") → Test connection
3. **Add client** → add pages (or Import CSV: `label,url,viewports?`)
4. **Run now** — the first successful capture of each page becomes its baseline automatically
5. Set each client's schedule (e.g. Monday 06:00) and notify list

### Updating

```bash
git pull && docker compose up -d --build
```

### Backups

Everything is in the `vigil-data` volume (SQLite DB + captures). Snapshot it or:

```bash
docker run --rm -v vigil_vigil-data:/data -v $(pwd):/backup alpine tar czf /backup/vigil-backup.tar.gz /data
```

---

## The maintenance-window flow

1. On a client, hit **Start checkpoint** before running updates — Vigil captures the current "before" state
2. Do the plugin/theme/core/hosting updates
3. Hit **Run now** — the report shows two comparisons per page: **Since you started work** (checkpoint → capture, the clean signal for what the update changed) and **Since last approved** (baseline → capture)
4. Review each flagged page: **Accept new as baseline** or **Keep old & flag** to Investigations
5. **End checkpoint**

Keyboard: `J` next unreviewed page · `A` accept · `K` keep & flag.

---

## Seeding the client fleet

The repo ships with Digital Treasury's client list ready to import:

- **`seed/clients.csv`** — every client with a homepage row (desktop + mobile). Import it straight away via **Dashboard → Import clients**.
- **`scripts/seed.mjs`** — the better option: discovers each site's 5–10 key pages automatically (sitemap first, homepage nav as fallback), verifies each page returns 200, and writes `seed/vigil-seed.csv` — or pushes directly into a running instance:

```bash
node scripts/seed.mjs                              # writes seed/vigil-seed.csv to review/import
node scripts/seed.mjs --push http://localhost:3000 # discover + import in one step (needs DEV_AUTH_BYPASS=1)
node scripts/seed.mjs --max 10                     # allow up to 10 pages per client
```

The client list (names + URLs) lives at the top of `scripts/seed.mjs` — a few clients are missing URLs or have inferred ones flagged `verify: true`; fill/check those and re-run. Re-running is always safe: existing clients are matched by name and already-tracked pages are skipped.

## Local development

```bash
npm install
DEV_AUTH_BYPASS=1 npm run dev
```

`DEV_AUTH_BYPASS=1` skips Google sign-in. Playwright needs a Chromium: `npx playwright install chromium`, or point `CHROMIUM_PATH` at an existing binary.

## Configuration reference

| Env var | Required | Purpose |
|---|---|---|
| `APP_URL` | prod | Public URL (OAuth redirect + email links) |
| `AUTH_SECRET` | prod | Session-cookie signing secret |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | prod | Google SSO |
| `ALLOWED_EMAIL_DOMAIN` | no | Workspace domain (default `digitaltreasury.com.au`) |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_SECURE` | no | Notification email |
| `VIGIL_DATA_DIR` | no | Data directory (default `./data`; `/data` in Docker) |
| `DEV_AUTH_BYPASS` | never in prod | Skip auth for local dev |
| `CHROMIUM_PATH` | no | Fallback Chromium binary |

In-app settings (Settings screen): Anthropic API key, global diff threshold (default 1.0%), retention cap (default 90 days), notification from-address. Per-client overrides: threshold, retention, Lighthouse on/off, schedule, notify list.
