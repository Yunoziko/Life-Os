# AZIO

AZIO is an intelligent personal operating system. Your life, organized intelligently.

This repository is the production foundation: authentication, the application shell, dashboard, command palette, global search, and a PostgreSQL schema that the rest of the product can grow on.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS + shadcn/ui
- Auth.js (email/password + Google)
- Prisma + PostgreSQL

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
cp .env.example .env
```

3. Generate an auth secret and put it in `.env`:

```bash
openssl rand -base64 32
```

4. Start PostgreSQL. Homebrew (already common on macOS):

```bash
createdb lifeos
```

Set `DATABASE_URL` to your local user, for example:

```bash
DATABASE_URL="postgresql://YOUR_USER@localhost:5432/lifeos"
```

Or use Docker:

```bash
docker compose up -d
```

5. Push the schema and generate the client:

```bash
npm run db:generate
npm run db:push
```

6. Run the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Auth

- Email and password work out of the box.
- Google OAuth appears only when `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` are set.

## What’s in this phase

- Landing, login, signup
- Protected workspace shell
- Dashboard, tasks, goals, projects, notes, habits, calendar
- Command palette (`⌘K`) and global search
- AZIO AI, integrations, analytics, Razorpay billing
- AI agents and automations
- Background automation worker and in-app notifications

## Scripts

- `npm run dev` — development server
- `npm run worker` — background automation worker (also runs the scheduler)
- `npm run scheduler` — scheduler only, for a split production process
- `npm run test` — unit tests
- `npm run typecheck` — TypeScript
- `npm run lint` — ESLint
- `npm run db:push` — sync Prisma schema
- `npm run db:studio` — inspect data

## Background automations

Scheduled automations do **not** run in the browser or inside normal page requests. A worker process claims due jobs from PostgreSQL and executes them.

Local development:

```bash
# Terminal 1
npm run dev

# Terminal 2
npm run worker
```

Optional third terminal if you want the scheduler isolated:

```bash
npm run scheduler
```

If `npm run worker` is running, you do not need a separate scheduler. Set `AUTOMATION_WORKER_INCLUDE_SCHEDULER=0` on the worker if you split the processes.

### How to test Daily Brief

1. Upgrade the account to AZIO Pro.
2. Open `/automations` and use the **Morning Brief** template (every day at 8:00 AM in your profile timezone).
3. Click **Run now**. The run should show **Queued**, then **Running**, then **Completed**.
4. Open `/notifications`. You should see **Your Daily Brief is ready.**
5. The generated brief is stored as a note.

If a run stays **Queued**, the worker is not running.

### Failed jobs

- Open the automation detail page and inspect the run. Users see a safe error, not a stack trace.
- Worker logs include `automationId`, `runId`, `user` (short ref), `status`, and `duration` only.
- Transient failures retry 3 times with backoff: 30s, 2 minutes, 10 minutes.

### Worker health

`GET /api/health/worker` returns worker status, queue depth, and last tick. Protect it with `CRON_SECRET` or `WORKER_HEALTH_SECRET`. In production a bearer token is required; a signed-in session is not enough.

### Health checks

| Endpoint | Purpose |
| --- | --- |
| `GET /api/health` | Liveness. Process is up. |
| `GET /api/health/ready` | Readiness. Database ping. Returns 503 if the database is unreachable. |
| `GET /api/health/worker` | Worker heartbeat and queue counts. Secret-protected. |

Do not expose secrets or internal topology from these endpoints.

### Redis / BullMQ

Redis is **not** required. The MVP queue is database-backed (`AutomationRun` rows in `QUEUED`, claimed with `FOR UPDATE SKIP LOCKED`).

Recommended production architecture:

```
Web app  →  PostgreSQL
Scheduler →  enqueues due automations
Worker    →  claims and executes jobs
Redis     →  optional BullMQ queue (`azio-automation`) when REDIS_URL is set later
```

Set `REDIS_URL` only when you add a Redis-backed queue. Leave it empty for local PostgreSQL-backed jobs.

Environment:

```bash
REDIS_URL=""
AUTOMATION_WORKER_CONCURRENCY=5
QUEUE_DRIVER=database
```

## Razorpay billing

AZIO uses **Razorpay Subscriptions**, not Stripe. The app runs locally on the Free plan without Razorpay credentials.

### Plans

| Plan | Price | Notes |
| --- | --- | --- |
| Free | ₹0/month | 5 active projects, 5 active goals, 10 active habits, 100 AI messages/month, 1 integration, basic analytics |
| Pro | ₹499/month | Unlimited workspace depth, advanced analytics, weekly AI review, all integrations, 2,000 AI messages/month |
| Pro Annual | ₹4,999/year | Same entitlements as Pro. Architecture is ready; set `RAZORPAY_PRO_ANNUAL_PLAN_ID`. |

Plan IDs and prices sent by the browser are ignored. The server maps “Upgrade to Pro” to the configured Razorpay plan.

### Test mode setup

1. Create a Razorpay account and switch to **Test Mode**.
2. Dashboard → **Subscriptions** → **Plans** → create:
   - AZIO Pro monthly, INR 499, billing period monthly
   - AZIO Pro annual, INR 4999, billing period yearly
3. Copy the plan IDs into `.env`:

```bash
RAZORPAY_KEY_ID="rzp_test_..."
RAZORPAY_KEY_SECRET=""
RAZORPAY_WEBHOOK_SECRET=""
RAZORPAY_PRO_PLAN_ID="plan_..."
RAZORPAY_PRO_ANNUAL_PLAN_ID="plan_..."
```

Never put live keys in `.env.example` or git.

### Webhooks

Endpoint: `POST /api/razorpay/webhook`

Dashboard → **Webhooks** (test mode) → add that URL with the subscription and payment events Razorpay offers for subscriptions, including:

- `subscription.authenticated`
- `subscription.activated`
- `subscription.charged`
- `subscription.updated`
- `subscription.pending`
- `subscription.halted`
- `subscription.cancelled`
- `subscription.completed`
- `subscription.paused`
- `payment.failed`

Copy the webhook secret into `RAZORPAY_WEBHOOK_SECRET`. AZIO verifies `X-Razorpay-Signature` with HMAC SHA-256 of the **raw** body.

### Local webhook testing

Use the Razorpay dashboard to resend test events, or a tunnel:

```bash
ngrok http 3000
```

Point the test webhook at `https://YOUR_TUNNEL/api/razorpay/webhook`.

A successful Checkout in the browser is **not** enough to grant Pro. The verified webhook (or Settings → Billing → Manage subscription, which refreshes from Razorpay) updates access.

### Production

Keep **TEST** keys (`rzp_test_…`) until live charges are explicitly approved.

Live keys (`rzp_live_…`) are ignored unless `AZIO_ALLOW_LIVE_PAYMENTS=true` is set on the server. Webhook URL for both modes:

`https://azio.fun/api/razorpay/webhook`

Keep `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET` on the server only. A successful Checkout does not grant Pro until the verified webhook runs.

### Account deletion

AZIO does not delete accounts in this release. If deletion is added later, `cancelPaidSubscriptionsForDeletedUser()` must run first so an active Razorpay subscription is not left charging.

## Architecture

```
Browser  →  Next.js App Router (pages + server actions)
         →  Auth.js JWT session (trusted user id)
         →  Prisma / PostgreSQL

API      →  /api/auth/*           Auth.js
         →  /api/ai/chat          AZIO AI (registered tools only)
         →  /api/razorpay/webhook HMAC-verified billing
         →  /api/integrations/*   Google / GitHub OAuth (tokens never sent to the browser)
         →  /api/cron/automations secret-only enqueue
         →  /api/health*          liveness / readiness / worker

Worker   →  claims AutomationRun rows with FOR UPDATE SKIP LOCKED
Scheduler→  enqueues due scheduled automations (can run inside the worker)
```

Ownership is always `id + userId` (or equivalent). Server operations derive the user from the Auth.js session, never from a client-supplied `userId`.

## Environment

Copy `.env.example` to `.env`. Never commit `.env` or live credentials.

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | PostgreSQL |
| `AUTH_SECRET` | yes | Auth.js JWT signing |
| `AUTH_URL` | yes | Public origin. Production: `https://azio.fun` |
| `INTEGRATION_ENCRYPTION_KEY` | production | AES-256-GCM for OAuth tokens. Locally `AUTH_SECRET` is a fallback. |
| `CRON_SECRET` | production | Bearer token for cron + worker health |
| `AI_API_KEY` / provider keys | for AI | Server-only |
| `RAZORPAY_*` | for billing | Test keys (`rzp_test_`) until `AZIO_ALLOW_LIVE_PAYMENTS=true` |
| `AUTH_GOOGLE_*` / `GITHUB_*` | for OAuth | Redirect URIs listed in `.env.example` |
| `ALLOWED_ORIGINS` | optional | Extra browser origins for AI CORS checks |
| `RATE_LIMIT_*` | optional | Override default buckets |

`NODE_ENV=production` tightens cron authorization, HSTS, and encryption-key requirements. Do not run production with debug logging of request bodies.

## OAuth setup

Production origin: `https://azio.fun`

Google Cloud (same client as login + Calendar/Gmail):

- JavaScript origins: `https://azio.fun`, `https://www.azio.fun`
- Redirect URIs:
  - `https://azio.fun/api/auth/callback/google` (Google sign-in)
  - `https://azio.fun/api/integrations/google/callback` (Calendar and Gmail)

GitHub OAuth App (integrations only — not login):

- Homepage: `https://azio.fun`
- Callback: `https://azio.fun/api/integrations/github/callback`

Tokens are encrypted at rest and never returned to the client. Disconnect wipes stored tokens and best-effort revokes Google / GitHub access.

## Deployment (Vercel)

The repo contains `vercel.json` (cron every 15 minutes). There is **no** GitHub Actions workflow and **no** linked `.vercel` project in git.

Intended production split:

1. **Web** — Vercel (`next start` via Vercel build). Production branch: `main`.
2. **Database** — hosted PostgreSQL. This repo does **not** name a vendor. Set `DATABASE_URL` in Vercel. Migrate with `npm run db:migrate:deploy` (never `db push` in production).
3. **Scheduler** — Vercel Cron → `GET /api/cron/automations` (sends `Authorization: Bearer $CRON_SECRET` when that env var is set). The route enqueues due automations and drains up to 3 queued jobs.
4. **Worker** — optional dedicated process: `npm run worker`. Recommended if automations must run more often than the cron window. Redis is **not** required (`QUEUE_DRIVER=database`).
5. **Canonical URL** — `https://azio.fun`. `https://www.azio.fun` 301s to the apex.

### DNS (Vercel, external nameservers)

Add `azio.fun` and `www.azio.fun` in the Vercel project **Settings → Domains**, then copy the values from that domain card if they differ. Vercel’s documented general-purpose records ([custom domain](https://vercel.com/docs/domains/set-up-custom-domain), [A records](https://vercel.com/kb/guide/a-record-and-caa-with-vercel)):

| Type | Host | Value | TTL |
| --- | --- | --- | --- |
| A | `@` (azio.fun) | `76.76.21.21` | provider default (often Auto / 3600) |
| CNAME | `www` | `cname.vercel-dns-0.com` | provider default (often Auto / 3600) |

Confirm with `vercel domains inspect azio.fun` after the Vercel project exists. Do not point DNS until the project is created — a wrong A/CNAME will fail SSL.

Vercel issues the certificate after DNS validates. HTTP→HTTPS is handled by Vercel. The app also 301s `www.azio.fun` → `https://azio.fun`.

Set Vercel env `AUTH_URL=https://azio.fun` and `NEXT_PUBLIC_APP_URL=https://azio.fun`.

Vercel Cron Jobs require a plan that includes crons (typically Pro). Hobby may not run `vercel.json` crons.

### Production start commands

- Web (Vercel): `npm run build` then the platform runs `next start`
- Dedicated worker: `npm run worker`
- Dedicated scheduler only: `npm run scheduler`
- Production migrations: `npm run db:migrate:deploy`

## Security considerations

- Protected pages require a session (`proxy.ts`). APIs authenticate independently.
- Cron and worker health **must** use `Authorization: Bearer $CRON_SECRET` in production. Vercel Cron injects this header when `CRON_SECRET` is set. Sessions cannot enqueue other users’ automations.
- Razorpay webhooks verify HMAC of the raw body and are idempotent (`BillingWebhookEvent.eventKey`).
- AI system instructions live on the server. Tools are a registry; SQL, shell, eval, and billing tools are forbidden.
- External content (Gmail, GitHub, calendar, notes) is wrapped as untrusted data.
- Agents cap at 10 steps and 45 seconds. Destructive tools require confirmation.
- Automations check ownership, Pro entitlement, enabled state, idempotency, retries (3), and a 55s execution timeout.
- Rate limits cover login, signup, AI, agents, automations, billing, Gmail, GitHub, and search. The default store is in-process memory. Multi-instance production should put a Redis-backed store behind `getCache()` (`REDIS_URL` is reserved; it is not wired yet).
- Security headers include CSP (Razorpay Checkout + Google avatars allowed), `nosniff`, Referrer-Policy, Permissions-Policy, and HSTS in production.
- CORS is origin-allowlist based (`AUTH_URL`, localhost, `ALLOWED_ORIGINS`). There is no `Access-Control-Allow-Origin: *`.
- CSRF: Auth.js cookies + Next.js server-action origin checks. Do not add a second CSRF token stack.
- Password reset is **not** implemented.

## Health checks

- Liveness: `GET /api/health`
- Readiness (database): `GET /api/health/ready`
- Worker (secret): `GET /api/health/worker`

## Database backups

AZIO **does not** implement backups. PostgreSQL backups are an operator responsibility.

Recommended:

- **Frequency:** daily full backup, plus continuous WAL / point-in-time recovery if the host supports it (for example managed Postgres PITR).
- **Retention:** at least 7 days; 30 days for production billing data.
- **Recovery expectation:** restore a recent backup, run pending Prisma migrations (`npm run db:migrate` / `prisma migrate deploy`), then start web + worker. Expect minutes to hours depending on database size, not instant failover, unless you add a replica yourself.
- **Migration strategy:** Prisma migrations in `prisma/migrations`. Apply with `prisma migrate deploy` in production. Never `db push` against production. Test migrations against a copy of production data first.
- **Secrets:** backup encryption keys (`AUTH_SECRET`, `INTEGRATION_ENCRYPTION_KEY`) separately from the database. Lost encryption keys make stored OAuth tokens unreadable.

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| Automation stays Queued | Cron/worker is not running, or Vercel plan has no Cron Jobs |
| `INTEGRATION_ENCRYPTION_KEY is not set` | Required in production; set a dedicated 32-byte secret |
| Cron 401 | Missing `Authorization: Bearer $CRON_SECRET` |
| Health ready 503 | Database unreachable |
| Pro not unlocking after Checkout | Webhook secret/URL mismatch, or signature failed |
| Google / GitHub reconnect prompt | Token expired or revoked; reconnect in Settings |
| Rate limit errors | Tune `RATE_LIMIT_*` or wait for the window |
| AI “Something went wrong. Reference: …” | Check structured logs for the same request id |

Errors shown to users are generic. Logs include `requestId` / `user` (short ref) / `route` / `status` / `duration` and never OAuth tokens, API keys, passwords, full email bodies, or Razorpay secrets.

