# Security model

Proof: `npm run db:test` — 120+ assertions run as real `anon`/`authenticated` roles with JWT claims inside one rolled-back transaction.

## Phone number (the product)
1. `profiles` is readable only by its owner (`own profile` policy). anon has no grant at all.
2. Everyone else reads `public_profiles` (no phone column).
3. `get_job_contact(job_id)` is the only path to another user's phone. It returns rows only for the caller's own active awards: the publisher gets every awarded worker; a worker gets the publisher. Zero-row calls are logged to `contact_lookup_failures`.

## Invariant: user A cannot read user B's bid on user C's job
`bids` SELECT policy: `bidder_id = auth.uid() OR is_job_owner(job_id) OR is_admin()`. A is neither the bidder (B) nor the owner (C), so the row is filtered. anon has no SELECT grant on `bids`. Public pages read only `jobs.bid_count` and `jobs.lowest_rate`, maintained by trigger.

## Writes
- No client INSERT/UPDATE on `bids`, `awards`, `payments`, `user_roles`; RPCs only.
- `jobs`: insert only as self, only `draft`, only granted columns; update only own rows in `draft/pending_payment/pending_review/rejected`, never `status`.
- `profiles`: update only own row, only `full_name, phone, avatar_url, bio, district_id, city, lat, lng, preferred_lang, crew_size`. Changing `phone` resets `phone_verified`.
- `reviews`: insert requires a completed, non-cancelled award between reviewer and reviewee on that job.
- `job_threads`: insert as self on published jobs (or own job); edit/delete own within 15 minutes.
- Admin RPCs check `require_staff()` / `require_admin()`. No code path grants `admin`; use `npm run db:make-admin`.
- Moderators cannot review their own jobs (`own_job`) and cannot see payments or bids.

## Abuse limits (DB-enforced)
5 job submissions / 30 bids / 20 Q&A posts per user per day (`rate_limits`).
