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

Use live Razorpay keys, live plan IDs, and a HTTPS webhook URL. Keep `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET` on the server only.

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
| `AUTH_URL` | yes | Public origin, HTTPS in production |
| `INTEGRATION_ENCRYPTION_KEY` | production | AES-256-GCM for OAuth tokens. Locally `AUTH_SECRET` is a fallback. |
| `CRON_SECRET` | production | Bearer token for cron + worker health |
| `AI_API_KEY` / provider keys | for AI | Server-only |
| `RAZORPAY_*` | for billing | Test keys locally, live keys only on the server |
| `AUTH_GOOGLE_*` / `GITHUB_*` | for OAuth | Redirect URIs listed in `.env.example` |
| `ALLOWED_ORIGINS` | optional | Extra browser origins for AI CORS checks |
| `RATE_LIMIT_*` | optional | Override default buckets |

`NODE_ENV=production` tightens cron authorization, HSTS, and encryption-key requirements. Do not run production with debug logging of request bodies.

## OAuth setup

- Google Calendar / Gmail: authorized redirect `{AUTH_URL}/api/integrations/google/callback`
- GitHub: `{AUTH_URL}/api/integrations/github/callback`
- Tokens are encrypted at rest and never returned to the client
- Disconnect wipes stored tokens and best-effort revokes Google / GitHub access
- Expired tokens surface a reconnect message; they are not retried forever

## Security considerations

- Protected pages require a session (`proxy.ts`). APIs authenticate independently.
- Cron and worker health **must** use `Authorization: Bearer $CRON_SECRET` in production. Sessions cannot enqueue other users’ automations.
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

## Deployment architecture

Recommended processes:

1. **Web** — `npm run build && npm run start`
2. **Worker** — `npm run worker` (includes scheduler unless `AUTOMATION_WORKER_INCLUDE_SCHEDULER=0`)
3. **Scheduler** — optional split: `npm run scheduler`

Put PostgreSQL behind TLS. Terminate HTTPS at the load balancer. Set `AUTH_URL` to the public HTTPS origin.

Health:

- Load balancer liveness: `GET /api/health`
- Readiness before traffic: `GET /api/health/ready`
- Worker probe (secret): `GET /api/health/worker`

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
| Automation stays Queued | Worker is not running |
| `INTEGRATION_ENCRYPTION_KEY is not set` | Required in production; set a dedicated 32-byte secret |
| Cron 401 | Missing `Authorization: Bearer $CRON_SECRET` |
| Health ready 503 | Database unreachable |
| Pro not unlocking after Checkout | Webhook secret/URL mismatch, or signature failed |
| Google / GitHub reconnect prompt | Token expired or revoked; reconnect in Settings |
| Rate limit errors | Tune `RATE_LIMIT_*` or wait for the window |
| AI “Something went wrong. Reference: …” | Check structured logs for the same request id |

Errors shown to users are generic. Logs include `requestId` / `user` (short ref) / `route` / `status` / `duration` and never OAuth tokens, API keys, passwords, full email bodies, or Razorpay secrets.

