# CoConnect — labour marketplace

Marketplace connecting job publishers with workers and brokers in Sri Lanka.
Coconut plantation and construction work first.

The full product plan is `Coconnect— Labour Marketplace Full Implementation Plan.md`.
Decisions that deviate from it are recorded in `docs/00-decisions.md` — read that first.

## Stack
Next.js 16 App Router + TypeScript (strict) · Tailwind v4 + shadcn-style primitives
Supabase (Postgres, Auth, Storage, Realtime) · Vercel · next-intl (en/si/ta)

Next 16 notes: middleware is `src/proxy.ts`. `cacheComponents` is OFF on purpose
(see docs/00-decisions.md). Read `node_modules/next/dist/docs/` before using an
unfamiliar Next API.

## Non-negotiable rules
1. A phone number is NEVER returned to a client except through the
   `get_job_contact(job_id)` RPC, which requires an active award.
   Never select `profiles.phone` of another user in application code. Read `public_profiles`.
2. Every table has RLS enabled. A new table without a policy is a bug.
3. Authorisation lives in Postgres (RLS + SECURITY DEFINER functions),
   not in React. Next.js may hide a button; the database decides.
   State transitions (submit, approve, bid, award, complete) are RPCs only —
   `authenticated` has no direct UPDATE on `jobs.status`, `bids`, `awards`.
4. No hardcoded user-facing strings. Every string goes through next-intl.
5. Money is `numeric`, never `float`. Currency is LKR. Display as `Rs. 3,500`.
6. Server Components by default. `'use client'` only for real interactivity.
7. All mutations are server actions with Zod validation at the boundary.
8. Never commit `.env*`. Never use the service role key outside
   `src/lib/supabase/admin.ts` (server-only) and webhook handlers.

## Conventions
- Files kebab-case, components PascalCase, DB snake_case.
- Migrations are append-only; never edit an applied migration. Add a new numbered file.
- Every server action returns `{ ok: true, data } | { ok: false, error }` (`src/lib/result.ts`).
- DB functions raise short error codes (`raise exception 'self_bid'`); the app maps them
  to `errors.<code>` in the locale files.
- Dates are `timestamptz`; format in the UI, never in the database.

## Commands
npm run dev | build | lint | typecheck
npm run db:push        # apply supabase/migrations to DATABASE_URL (hosted project)
npm run db:seed        # (re)load supabase/seed.sql — idempotent
npm run db:types       # regenerate src/lib/database.types.ts
npm run db:test        # RLS / invariant test suite (runs in a rolled-back transaction)
npm run test:e2e       # HTTP smoke test against a running app (npm run build && npx next start)
npm run i18n:check     # si and ta must have every en key with the same {placeholders}
npm run db:make-admin -- you@example.com

## Before you finish any task
Run `npm run typecheck` and `npm run lint`. Both must pass.
If you added a table, add its RLS policies in the same migration and a case in scripts/db-test.ts.
If you added a string, add it to all three locale files.
