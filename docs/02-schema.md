# Schema

Migrations live in `supabase/migrations/` and are append-only.

| File | Contents |
|------|----------|
| 0001_schema.sql | enums, tables, indexes, deny-by-default privileges |
| 0002_functions.sql | helpers, triggers, every RPC (lifecycle, bidding, awards, payments, admin, stats, cron bodies) |
| 0003_rls.sql | RLS policies, column-level grants, `public_profiles` view, function grants, realtime publication |
| 0004_storage.sql | buckets `job-images` (public), `avatars` (public), `bank-slips` (private) + policies |
| 0005_cron.sql | pg_cron schedules |
| 0006_function_privileges.sql | revoke PUBLIC EXECUTE globally; admin search fix |

Seed: `supabase/seed.sql` (25 districts, 114 towns, 2 parent + 8 child categories, app settings). Idempotent.

## Multi-award additions vs the plan

- `awards`: `bid_id unique`, `workers_count`, `completion_requested_by/at`, `cancelled_by`.
- `jobs`: `hiring_closed_at`, `submitted_at`, `expiry_warned_at`, `cancel_reason`, `payment_ref`, `contact_flags`, `lowest_rate`, `search_text` (generated, trigram-indexed).
- `bids`: `auto_rejected`, `updated_at`; `total_amount` unit-aware.
- `reviews`: unique `(job_id, reviewer_id, reviewee_id)`.
- New tables: `rate_limits`, `contact_lookup_failures`.
- `notifications`: `type` + `data jsonb` (rendered via i18n `notifications.<type>`), `emailed_at`.
- `app_settings.is_public` controls anon visibility (fees flag, bank details, banner).

Regenerate types after any migration: `npm run db:types`.
