# Vigil

Internal **visual & code regression testing** tool for Digital Treasury. For a curated set of
high-value pages per client, Vigil captures full-page screenshots + served HTML + rendered DOM +
Lighthouse, diffs each new capture against an accepted-good **baseline** (and an optional pre-update
**checkpoint**), and lets the team accept intended changes or flag regressions — with an optional
on-demand **Claude** severity assessment.

> Find breakage before the client does.

## Stack

- **App:** Next.js (App Router, TS) — UI + API routes + Auth.js (Google SSO, domain-locked).
- **Worker:** Node + Playwright (Chromium) + Lighthouse + sharp — BullMQ consumers.
- **Queue:** BullMQ on Redis (two queues: screenshots vs Lighthouse).
- **DB:** Postgres + Prisma.
- **Storage:** pluggable driver — `LocalDriver` (v1), `S3Driver` (Cloudflare R2) later.
- **Packaging:** one portable Docker Compose stack (`app` · `worker` · `postgres` · `redis` · `caddy`).

## Monorepo layout

```
apps/app        Next.js app
apps/worker     capture/diff/notify worker
packages/db     Prisma schema + client
packages/core   shared types, enums, status colours, threshold/retention/CSV/assessment helpers
packages/storage pluggable storage driver (Local / S3-R2)
```

## Local development (local-first)

```bash
# 1. Install
pnpm install

# 2. Configure
cp .env.example .env
#   - AUTH_SECRET:     openssl rand -base64 32
#   - ENCRYPTION_KEY:  openssl rand -hex 32
#   - AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET (Workspace "Internal" OAuth client)

# 3. Start infra (Postgres + Redis in Docker)
pnpm infra:up

# 4. Create the schema
pnpm db:migrate

# 5. Run app + worker (host, with HMR)
pnpm dev
```

App: http://localhost:3000

## Deploy (later)

The whole stack is one portable Docker package. The deploy target must be a **root-enabled Docker
VPS** (Hetzner / DigitalOcean / Vultr) — a Cloudways-*managed* server cannot run Docker. 8 GB RAM +
dedicated CPU recommended (Lighthouse is the heavy consumer).

```bash
cp .env.example .env   # set APP_DOMAIN, AUTH_*, ENCRYPTION_KEY, RESEND_API_KEY, etc.
docker compose up -d   # app + worker + postgres + redis + caddy (auto-HTTPS)
```

## Prerequisites

- **Google OAuth** client (Workspace "Internal" app) — id, secret, redirect URI.
- **Resend** account + DKIM/SPF DNS for `vigil@digitaltreasury.com.au`.
- **Anthropic API key** — entered in-app via Settings (assessments are manual).

See `IMPLEMENTATION_PLAN` (the approved plan) for the full design, feasibility notes, and phases.
