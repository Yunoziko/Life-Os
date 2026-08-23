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
