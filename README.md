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

`GET /api/health/worker` returns worker status, queue depth, and last successful execution. Protect it with `CRON_SECRET` or `WORKER_HEALTH_SECRET`. In production it requires a bearer token or a signed-in session.

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
