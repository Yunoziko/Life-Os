# LifeOS

An AI-powered personal operating system. This repository is the production foundation: authentication, the application shell, dashboard, command palette, global search, and a PostgreSQL schema that the rest of the product can grow on.

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
- Dashboard with honest empty states
- Command palette (`⌘K`)
- Global search (`/`)
- Foundation pages for every planned module
- Prisma models for users, tasks, goals, projects, notes, habits, calendar, and AI conversations
- Redis, jobs, storage, and AI provider abstractions — ready, not wired

## Scripts

- `npm run dev` — development server
- `npm run typecheck` — TypeScript
- `npm run lint` — ESLint
- `npm run db:push` — sync Prisma schema
- `npm run db:studio` — inspect data

## Razorpay billing

LifeOS uses **Razorpay Subscriptions**, not Stripe. The app runs locally on the Free plan without Razorpay credentials.

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
   - LifeOS Pro monthly, INR 499, billing period monthly
   - LifeOS Pro annual, INR 4999, billing period yearly
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

Copy the webhook secret into `RAZORPAY_WEBHOOK_SECRET`. LifeOS verifies `X-Razorpay-Signature` with HMAC SHA-256 of the **raw** body.

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

LifeOS does not delete accounts in this release. If deletion is added later, `cancelPaidSubscriptionsForDeletedUser()` must run first so an active Razorpay subscription is not left charging.
