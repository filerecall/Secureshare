# SecureShare

A lean SaaS for secure document delivery. Users upload documents, send tokenised secure links to recipients, and can revoke or expire access at any time. This repository is the **Milestone 1** foundation: authentication, protected dashboard shell, and the underlying database schema for the full product.

## Tech stack

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend**: Next.js API routes
- **Database & Auth**: Supabase (PostgreSQL + Supabase Auth)
- **File storage**: AWS S3 _(wired up in M2)_
- **Email**: Resend _(wired up in M2)_
- **Deployment**: Vercel (frontend) + Supabase (DB) + AWS S3 (storage)

## What's in Milestone 1

- Email/password signup, login, logout, and password reset
- Server-side session handling via `@supabase/ssr`
- Middleware that protects `/dashboard/*` and bounces signed-in users away from `/login` and `/signup`
- Full SQL schema (`users`, `documents`, `share_links`, `access_events`) with Row Level Security
- Auth trigger that mirrors new `auth.users` rows into `public.users`
- Empty dashboard shell with a disabled "Upload" affordance for M2

## Prerequisites

- **Node.js 20+** (Next 14 supports 18.17+, but 20 is the recommended baseline)
- **npm 10+** (or pnpm/yarn - examples below use npm)
- A **Supabase** project (free tier is fine)

## Local setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables
cp .env.example .env.local
# then fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
# and SUPABASE_SERVICE_ROLE_KEY from your Supabase project's API settings.

# 3. Apply database migrations (see next section)

# 4. Run the dev server
npm run dev
```

The app is now available at <http://localhost:3000>.

## Running the migrations against a fresh Supabase project

The SQL lives under `db/migrations/`. There are two easy ways to apply it:

### Option A - Supabase SQL editor (fastest)

1. Open your Supabase project → **SQL Editor** → **New query**.
2. Paste the contents of [`db/migrations/0001_init.sql`](db/migrations/0001_init.sql).
3. Run.

### Option B - Supabase CLI

```bash
npm install -g supabase
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
```

(You may need to add the migration into Supabase's expected `supabase/migrations` folder, or run it directly via `supabase db execute < db/migrations/0001_init.sql`.)

### Configure Supabase auth

In **Authentication → URL Configuration**:

- **Site URL**: `http://localhost:3000` (or your deployed URL)
- **Redirect URLs**: add `http://localhost:3000/reset-password` and `http://localhost:3000/dashboard`

For local development without email confirmation, you can disable "Confirm email" under **Authentication → Providers → Email**.

## Folder structure

```
.
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth pages grouped under a shared layout
│   │   ├── login/
│   │   ├── signup/
│   │   ├── forgot-password/
│   │   └── reset-password/
│   ├── dashboard/                # Protected dashboard
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                  # Landing page
├── components/
│   ├── ui/                       # Button, Input, Card, FormMessage
│   ├── DashboardHeader.tsx
│   └── Logo.tsx
├── lib/
│   ├── supabase/                 # Browser, server, and middleware clients
│   ├── auth-errors.ts            # Friendly auth error messages
│   ├── env.ts                    # Typed env var accessors
│   └── utils.ts                  # cn() helper
├── types/
│   └── database.ts               # Row types matching the SQL schema
├── db/
│   └── migrations/0001_init.sql  # Initial schema + RLS + auth trigger
├── middleware.ts                 # Route protection + session refresh
├── .env.example
└── README.md
```

## Scripts

| Command          | What it does                  |
| ---------------- | ----------------------------- |
| `npm run dev`    | Start the dev server          |
| `npm run build`  | Production build              |
| `npm run start`  | Start the production server   |
| `npm run lint`   | Run ESLint                    |
| `npm run format` | Run Prettier on the workspace |

## Out of scope for M1

These ship in **Milestone 2**: file upload, S3 integration, secure link generation, recipient view page, revoke/expiry features, email notifications via Resend, the populated sender dashboard, and watermarking.
