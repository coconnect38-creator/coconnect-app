# CoConnect — Labour Marketplace: Full Implementation Plan

Oct 29, 2026 · @Coconnect

*A marketplace connecting job publishers with workers and brokers — starting with coconut plantation and construction work in Sri Lanka.*

## What we're building

A reverse-auction marketplace for manual labour: a landowner posts a job with a suggested daily rate, workers and brokers bid their own rate and crew size, the publisher picks a winner, and only then does the system release phone numbers to both sides. Coconut plantation and construction work first; every other trade is a row in the `categories` table an admin adds from the panel afterwards, with no deploy.

The phone number is the product. Everything of value on this platform happens on a phone call that follows a match, so the single most important engineering rule is that a contact number is never readable until an award exists. That one rule drives the whole security model in section 6, and it is what you will charge for in stage 2.

| Stage | What ships | Revenue | Rough build |
| --- | --- | --- | --- |
| 1 | Posting, bidding, awards, contact reveal, ratings, Q&A, admin moderation, bank-slip payments | None charged (fee engine built, switched off) | 6-9 weeks |
| 2 | PayHere card payments, paid category pricing, featured listings | Ad publishing fees | 3-4 weeks |
| 3 | Escrow held until work completes, broker crew and wage management, payouts | Commission on job value | 8-12 weeks |

### One contradiction to settle now

The brief says two things that conflict: *"at the first stage, we don't get fee for publishing"* and *"admin can set price for a category"* with *"direct bank transfers with bank slip"*.

Resolve it by building the fee machinery in stage 1 but leaving it off. Concretely: `categories.publish_fee_lkr` exists and admins can set it, the bank-slip upload and verification flow is built and tested, and a row in `app_settings` called `fees_enabled` defaults to `false`. When it is false, posting a job skips payment entirely and goes straight to the moderation queue. Flipping it to true the day you decide to charge costs nothing and needs no deploy.

This matters because retrofitting payment gating into an already-live posting flow is the single most expensive refactor on this roadmap.

## Decisions locked in

Supabase and Vercel were your call and they are the right one here: they remove the entire category of work (auth, file storage, hosting, SSL, CDN) that would otherwise eat the first month. Next.js is the natural third piece because Vercel builds it.

| Layer | Choice | Note |
| --- | --- | --- |
| Framework | Next.js 16 (App Router, TypeScript) | 16 is the current LTS line, supported to Oct 2027; 15 leaves support this month |
| UI | Tailwind CSS v4 + shadcn/ui | Copy-in components, no lock-in, easy to restyle |
| Database | Supabase Postgres | Row Level Security is the enforcement layer, not app code |
| Auth | Supabase Auth: email+password first, phone OTP second | See the SMS note below |
| Files | Supabase Storage | Buckets: `job-images` (public), `bank-slips` (private), `avatars` (public) |
| Realtime | Supabase Realtime | Live bid counts on a job page |
| Hosting | Vercel | Preview deploys per branch |
| i18n | next-intl | English, Sinhala, Tamil |
| Forms | React Hook Form + Zod | Zod schemas shared with server actions |
| Email | Resend | Bid received, job awarded, moderation outcome |
| Errors | Sentry | Free tier is enough at launch |
| Payments (stage 2) | PayHere | Section 9 |

### Three constraints that shape the code

**SMS costs real money.** Supabase Auth supports phone OTP through [Twilio, MessageBird, Vonage and TextLocal](https://supabase.com/docs/guides/auth/auth-messagebird), and by default a user can request one OTP per 60 seconds. Twilio to Sri Lankan numbers is expensive at volume. So: register with email, verify the phone with OTP once at profile completion, and allow phone+password login afterwards. Turn on CAPTCHA (hCaptcha) before OTP goes live or you will be paying for someone else's script. Budget for swapping in a local gateway (Notify.lk, Text.lk, Dialog) behind a small `sendSms()` interface rather than calling the provider directly.

**The mobile app is not a rewrite.** Put business logic in Postgres functions and RLS, not in Next.js server actions. A React Native/Expo app then talks to the same `supabase-js` client and gets the same rules for free. Rule of thumb: if a rule protects data, it lives in the database; if it only arranges pixels, it lives in Next.js.

**Rural users are on slow phones.** Server-render list and detail pages, compress uploads client-side before they hit Storage, cap job images at 5, and keep the homepage under 200 KB of JavaScript. Test on a throttled 3G profile, not your laptop.

## Roles and permissions

Don't put a single `role` column on the profile. A coconut landowner who posts a harvest job in July is a worker looking for masonry work in September, and a broker is a worker who happens to bring a crew. Use a `user_roles` join table so one account can hold several roles, and let the user add a role from their dashboard without re-registering.

| Role | Granted | Can do |
| --- | --- | --- |
| `publisher` | On signup, by default | Post jobs, view bids on own jobs, shortlist, award, see awarded bidder's phone, rate the worker, answer Q&A on own jobs |
| `worker` | On signup, by default | Browse and search jobs, place one bid per job, withdraw a bid, see publisher's phone once awarded, rate the publisher, ask questions |
| `broker` | Self-declared, admin-verifiable | Everything a worker can, plus bid with a crew size above 1, a public crew profile, and (stage 3) crew and wage management |
| `moderator` | Admin grants | Approve/reject jobs, handle reports, hide comments. Cannot touch payments or other users' roles |
| `admin` | Seeded manually in SQL | Everything, plus category pricing, payment verification, feature flags, role grants, audit log |

### Rules worth stating explicitly

- A user cannot bid on their own job. Enforce in a database trigger, not just in the UI.
- A broker is a flag on top of `worker`, never instead of it. `is_broker` on the profile stays as a fast-read denormalisation of the `broker` role row.
- `moderator` exists from day one even if you are the only person using it. Separating it from `admin` means you can hire a moderator in month three without handing over the bank-slip screen.
- Admins are created by running SQL against the database, never through a signup form. There is no "become admin" code path in the application at all.
- Every privileged action an admin or moderator takes writes a row to `admin_actions`. When a user complains their job was rejected, you need to know who rejected it and why.

## Core flows

Every screen in the product is a step on one path. Build the state machine first and the pages fall out of it.

&#91;embedded content: job lifecycle · 9 states, 2 dead ends\]

The left-hand bypass is the `fees_enabled` flag: with fees off, a submitted job skips payment and goes straight to moderation. A rejected job returns to the publisher as an editable draft rather than disappearing.

### Bidding, in detail

Only `published` jobs accept bids. A bidder submits a rate, a rate unit, how many workers they can bring, how many days they need and an earliest start date; `total_amount` is computed by Postgres from those. One bid per person per job, editable and withdrawable while it is `pending`.

The publisher sees a table of every bid with the bidder's rating, review count and completed-job count. Everyone else sees only the bid count and the lowest rate. Shortlisting marks bids without committing, which is useful when a publisher wants to compare two brokers by phone later.

### Awarding is one transaction

Awarding touches four tables and must never half-happen. Do it in a single `award_bid(p_bid_id uuid)` SECURITY DEFINER function that verifies the caller owns the job and the job is still `published`, then inserts the `awards` row, sets that bid to `accepted`, sets all other bids on the job to `rejected`, moves the job to `awarded`, and queues notifications. If any step fails, none of it happened.

The contact reveal is not a step in that function. It is a consequence: once an `awards` row exists, `get_job_contact` starts returning numbers to those two users and to nobody else.

### Completion and the edge cases

Either party marks the work complete; the other confirms, or it auto-confirms after seven days. Only then can either side leave a rating, which is what stops reviews from people who never worked together.

The cases that will bite you, and the answers to build:

- **Awarded then it falls through.** Someone must be able to cancel an award with a reason. The job returns to `published` with its remaining bids intact. Log it — a publisher who cancels repeatedly is a pattern worth seeing.
- **The publisher never awards.** The job expires after 30 days and all bids close. Email the publisher at day 25.
- **A bid arrives as the job is being awarded.** The `lock_bids_after_award` trigger rejects it. Show the bidder a clear message, not a stack trace.
- **Only one side rates.** Publish the one rating you have. Do not hold reviews hostage to reciprocity; it just means nobody reviews.
- **A worker asks for the number before awarding.** This will happen constantly in the Q&A section. The auto-flag regex in moderation catches it in job text; for Q&A, warn the user and let moderators hide the post.

## Data model

This is the stage-1 schema in full. Give it to Claude Code as one migration file. Stage-3 tables are listed at the end but not created yet.

### Enums

```sql
create type app_role       as enum ('publisher','worker','broker','moderator','admin');
create type job_status     as enum ('draft','pending_payment','pending_review','published','rejected','awarded','in_progress','completed','cancelled','expired');
create type bid_status     as enum ('pending','shortlisted','accepted','rejected','withdrawn');
create type rate_unit      as enum ('per_worker_per_day','per_day','per_project');
create type payment_status as enum ('pending','verified','rejected');
create type payment_method as enum ('bank_slip','card','waived');
create type thread_kind    as enum ('question','comment');
```

### Core tables

```sql
-- Mirrors auth.users. Created by a trigger on auth.users insert.
create table profiles (
  id              uuid primary key references auth.users on delete cascade,
  full_name       text not null,
  phone           text,                       -- E.164, e.g. +94771234567
  phone_verified  boolean not null default false,
  avatar_url      text,
  bio             text,
  district_id     int references districts(id),
  city            text,
  lat             double precision,
  lng             double precision,
  preferred_lang  text not null default 'en' check (preferred_lang in ('en','si','ta')),
  is_broker       boolean not null default false,
  crew_size       int,                        -- brokers only
  rating_avg      numeric(3,2) not null default 0,
  rating_count    int not null default 0,
  jobs_completed  int not null default 0,
  is_suspended    boolean not null default false,
  created_at      timestamptz not null default now()
);

create table user_roles (
  user_id uuid references profiles(id) on delete cascade,
  role    app_role not null,
  primary key (user_id, role)
);

create table districts (
  id       serial primary key,
  name_en  text not null, name_si text not null, name_ta text not null,
  province text not null
);

create table cities (
  id          serial primary key,
  district_id int not null references districts(id),
  name_en     text not null, name_si text, name_ta text,
  lat double precision, lng double precision
);

create table categories (
  id               serial primary key,
  parent_id        int references categories(id),
  slug             text unique not null,
  name_en text not null, name_si text not null, name_ta text not null,
  icon             text,
  default_rate_unit rate_unit not null default 'per_worker_per_day',
  publish_fee_lkr  numeric(10,2) not null default 0,
  sort_order       int not null default 0,
  is_active        boolean not null default true
);
```

### Jobs and bids

```sql
create table jobs (
  id              uuid primary key default gen_random_uuid(),
  publisher_id    uuid not null references profiles(id) on delete cascade,
  category_id     int not null references categories(id),
  title           text not null check (char_length(title) between 10 and 120),
  description     text not null check (char_length(description) >= 30),
  district_id     int not null references districts(id),
  city            text,
  address_hint    text,                -- shown publicly, not a full address
  lat double precision, lng double precision,
  workers_needed  int check (workers_needed > 0),   -- nullable: optional per brief
  days_needed     int check (days_needed > 0),
  suggested_rate  numeric(10,2) not null,
  rate_unit       rate_unit not null default 'per_worker_per_day',
  start_date      date,
  is_date_flexible boolean not null default false,
  status          job_status not null default 'draft',
  reject_reason   text,
  reviewed_by     uuid references profiles(id),
  reviewed_at     timestamptz,
  published_at    timestamptz,
  expires_at      timestamptz,
  views_count     int not null default 0,
  bid_count       int not null default 0,
  is_featured     boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table job_images (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  storage_path text not null,
  sort_order int not null default 0
);

create table bids (
  id               uuid primary key default gen_random_uuid(),
  job_id           uuid not null references jobs(id) on delete cascade,
  bidder_id        uuid not null references profiles(id) on delete cascade,
  rate             numeric(10,2) not null check (rate > 0),
  rate_unit        rate_unit not null,
  workers_offered  int not null default 1 check (workers_offered > 0),
  days_offered     int check (days_offered > 0),
  total_amount     numeric(12,2) generated always as (
                     rate * coalesce(workers_offered,1) * coalesce(days_offered,1)
                   ) stored,
  message          text,
  can_start_on     date,
  status           bid_status not null default 'pending',
  created_at       timestamptz not null default now(),
  unique (job_id, bidder_id)
);

create table awards (
  id            uuid primary key default gen_random_uuid(),
  job_id        uuid not null unique references jobs(id) on delete cascade,
  bid_id        uuid not null references bids(id),
  publisher_id  uuid not null references profiles(id),
  worker_id     uuid not null references profiles(id),
  awarded_at    timestamptz not null default now(),
  completed_at  timestamptz,
  cancelled_at  timestamptz,
  cancel_reason text
);
```

`total_amount` as a generated column means the ranking of bids is computed by Postgres, never by the client. A bidder cannot send you a total that disagrees with their own rate.

### Social, money and plumbing

```sql
create table reviews (
  id          uuid primary key default gen_random_uuid(),
  job_id      uuid not null references jobs(id) on delete cascade,
  reviewer_id uuid not null references profiles(id) on delete cascade,
  reviewee_id uuid not null references profiles(id) on delete cascade,
  rating      int not null check (rating between 1 and 5),
  comment     text,
  is_hidden   boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (job_id, reviewer_id)
);

-- Q&A and comments share one threaded table.
create table job_threads (
  id         uuid primary key default gen_random_uuid(),
  job_id     uuid not null references jobs(id) on delete cascade,
  parent_id  uuid references job_threads(id) on delete cascade,
  author_id  uuid not null references profiles(id) on delete cascade,
  kind       thread_kind not null,
  body       text not null check (char_length(body) between 2 and 1000),
  is_hidden  boolean not null default false,
  created_at timestamptz not null default now()
);

create table payments (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(id),
  job_id        uuid references jobs(id) on delete set null,
  amount_lkr    numeric(10,2) not null,
  method        payment_method not null,
  slip_path     text,                 -- private storage key
  bank_ref      text,
  gateway_ref   text,                 -- stage 2
  status        payment_status not null default 'pending',
  verified_by   uuid references profiles(id),
  verified_at   timestamptz,
  reject_reason text,
  created_at    timestamptz not null default now()
);

create table ad_placements (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  image_path  text not null,
  target_url  text not null,
  district_id int references districts(id),   -- null = nationwide
  category_id int references categories(id),
  slot        text not null,  -- 'home_hero' | 'listing_inline' | 'job_sidebar'
  starts_on   date not null,
  ends_on     date not null,
  impressions bigint not null default 0,
  clicks      bigint not null default 0,
  is_active   boolean not null default true
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  type text not null, title text not null, body text,
  link text, read_at timestamptz,
  created_at timestamptz not null default now()
);

create table reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references profiles(id),
  target_type text not null,   -- 'job' | 'profile' | 'thread' | 'review'
  target_id uuid not null,
  reason text not null, details text,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create table admin_actions (
  id bigserial primary key,
  actor_id uuid not null references profiles(id),
  action text not null, target_type text, target_id uuid,
  meta jsonb, created_at timestamptz not null default now()
);

create table app_settings (
  key text primary key,
  value jsonb not null,
  updated_by uuid references profiles(id),
  updated_at timestamptz not null default now()
);
-- seed: ('fees_enabled', 'false'), ('job_expiry_days','30'),
--       ('bank_details', '{"bank":"","account":"","branch":"","name":""}')
```

### Indexes that matter

```sql
create index on jobs (status, published_at desc) where status = 'published';
create index on jobs (district_id, category_id, status);
create index on jobs (publisher_id, created_at desc);
create index on bids (job_id, total_amount asc);
create index on bids (bidder_id, created_at desc);
create index on reviews (reviewee_id);
create index on job_threads (job_id, created_at);
create index on notifications (user_id, read_at nulls first);

-- Trigram search across title and description
create extension if not exists pg_trgm;
create index jobs_search_idx on jobs using gin (
  (title || ' ' || description) gin_trgm_ops
);
```

### Triggers to write

1. `handle_new_user` on `auth.users` insert — create the `profiles` row and a default `publisher` + `worker` role pair.
2. `prevent_self_bid` before insert on `bids` — raise if `bidder_id` equals the job's `publisher_id`.
3. `bump_bid_count` after insert/delete on `bids` — maintain `jobs.bid_count`.
4. `recalc_rating` after insert/update on `reviews` — maintain `profiles.rating_avg` and `rating_count`.
5. `lock_bids_after_award` before insert/update on `bids` — reject writes when the job status is past `published`.
6. `touch_updated_at` before update on `jobs`.

### Stage 3, do not build yet

`escrow_holds`, `job_milestones`, `broker_crew` (broker\_id, worker\_id, daily\_wage), `wage_entries`, `payouts`, `payout_batches`. Design them when stage 2 is live and you know the real transaction shapes.

## Security model

Enable RLS on every table, including the ones that feel harmless. A table without RLS in a Supabase project is readable by anyone who opens the browser console and types a query against your anon key.

### Protecting the phone number

This is the one thing that must not leak. Three layers:

**Layer 1 — never select the column.** The `profiles` table holds `phone`, but no client ever reads `profiles` directly. They read a view that omits it:

```sql
create view public_profiles
with (security_invoker = true) as
select id, full_name, avatar_url, bio, district_id, city,
       is_broker, crew_size, rating_avg, rating_count,
       jobs_completed, created_at
from profiles
where is_suspended = false;
```

**Layer 2 — the RLS policy on `profiles` only lets you read your own row.**

```sql
create policy "own profile" on profiles
  for select using (id = auth.uid());
```

**Layer 3 — a single function releases a counterparty's number, and only against an award.**

```sql
create or replace function get_job_contact(p_job_id uuid)
returns table (full_name text, phone text)
language plpgsql security definer set search_path = public as $$
begin
  return query
  select p.full_name, p.phone
  from awards a
  join profiles p on p.id = case
        when a.publisher_id = auth.uid() then a.worker_id
        when a.worker_id    = auth.uid() then a.publisher_id
      end
  where a.job_id = p_job_id
    and a.cancelled_at is null
    and auth.uid() in (a.publisher_id, a.worker_id);
end $$;

revoke all on function get_job_contact(uuid) from public;
grant execute on function get_job_contact(uuid) to authenticated;
```

If there is no award, the function returns zero rows. There is no argument, no header and no URL that makes it return a number to a stranger. When you start charging for contact reveals in stage 2, you add one `exists (select 1 from payments ...)` clause to this function and nothing else in the codebase changes.

### Policy summary

| Table | Read | Write |
| --- | --- | --- |
| `profiles` | Own row only | Own row, except `rating_*`, `is_suspended`, `jobs_completed` |
| `public_profiles` | Anyone | View, no writes |
| `jobs` | `status = 'published'` to all; own rows to owner; all to moderator+ | Insert as self; update own only while `draft`/`pending_review`/`rejected` |
| `bids` | Bidder sees own; job owner sees all on their job; nobody else | Insert if job is `published`, not own job, not already bid; update own while `pending` |
| `awards` | The two parties, plus admins | Insert only through `award_bid()` RPC |
| `reviews` | Anyone, where `is_hidden = false` | Insert only if an award exists, the job is `completed`, and you were a party |
| `job_threads` | Anyone, where `is_hidden = false` | Insert if authenticated; update/delete own within 15 minutes |
| `payments` | Own rows; admins see all | Insert own; only admins may change `status` |
| `admin_actions`, `app_settings` | Admins only | Admins only |

Bid visibility is a product decision, not just a policy one. My recommendation: show other users the **bid count and the current lowest rate**, never bidder identities, until the job is awarded. It keeps competition honest without letting brokers undercut each other by name or letting publishers be farmed for contacts.

### Storage buckets

```sql
-- job-images: public read, owner-only write, path prefixed by user id
-- avatars:    public read, owner-only write
-- bank-slips: NO public read. Insert by owner, select by owner or admin.
```

Bank slips carry account numbers and names. That bucket is private, served only through short-lived signed URLs generated server-side for admins.

### Abuse limits to build in from day one

- hCaptcha on signup, on OTP request, and on job posting.
- Rate limits, enforced in a `rate_limits` table checked by trigger: 5 jobs per publisher per day, 30 bids per worker per day, 20 Q&A posts per user per day.
- Every job goes to `pending_review` before it is public. No exceptions, no auto-approve, not even for repeat users, until you have volume to justify a trust score.
- Strip EXIF from uploaded images server-side — phone cameras embed GPS coordinates of the person's home.
- Log failed `get_job_contact` calls. A spike is someone enumerating job ids.

## Stage 1 MVP scope

Ship this and nothing more. Every item below exists because the marketplace does not function without it.

**Accounts.** Email + password signup, email verification, profile completion (name, district, city, phone + OTP verification), optional avatar, phone+password login as a second option, password reset, role self-service (add `worker` or `broker` to an existing account).

**Posting.** Multi-step job form: category → location → details (title, description, workers needed, days, start date) → rate → photos → review. Save as draft. Submit to moderation. Edit while rejected and resubmit. Cancel. Auto-expire after 30 days.

**Discovery.** Browse all published jobs. Filter by district, category, rate range, start date. Sort by newest, closing soon, highest rate. Text search. "Near me" using the profile district, with browser geolocation as an optional upgrade. Job detail page with images, map pin, publisher rating, bid count, lowest bid, Q&A.

**Bidding.** Place a bid (rate, workers offered, days, message, earliest start). One bid per job per user, editable while pending, withdrawable. Publisher sees a sortable bid table with each bidder's rating and completed-job count. Shortlist. Award.

**Contact reveal.** On award, both parties get the other's name and phone on the job page and by email. The job moves to `in_progress`.

**Completion and reputation.** Either party marks the job complete; the other confirms, or it auto-confirms after 7 days. Both are then prompted for a 1–5 star rating plus a comment. Ratings appear on public profiles with the review list.

**Q&A and comments.** Threaded questions on a job, answerable by the publisher or anyone. Report button on everything.

**Admin.** Section 8.

**Payments.** Bank details page, slip upload, admin verification queue — all built, all behind `fees_enabled = false`.

**Notifications.** In-app bell plus email for: bid received, bid shortlisted, job awarded, job rejected by moderation, review received.

**Languages.** English and Sinhala at launch. Tamil strings stubbed and the switcher present, filled before public launch.

### Explicitly out of stage 1

In-app chat, saved searches, job alerts by SMS, worker portfolios with past-work photos, invoicing, subscriptions, a public API, native apps, multi-currency, and anything resembling a recommendation algorithm. Each of these is a reasonable idea and each one will cost you a week you do not have.

## Admin panel

Build it at `/admin`, gated by a middleware check on the `admin` or `moderator` role, with a second check in every server action. Do not rely on hiding the link.

| Screen | What it does | Role |
| --- | --- | --- |
| Dashboard | Counts: jobs awaiting review, payments awaiting verification, open reports, signups today, jobs awarded this week | Both |
| Moderation queue | Oldest-first list of `pending_review` jobs. Full preview, Approve, or Reject with a reason from a preset list plus free text. Rejection emails the publisher | Both |
| Jobs | Search and filter all jobs by any status. Force-unpublish, feature, extend expiry, cancel | Both |
| Users | Search by name, phone, email. View profile, roles, job history, ratings. Grant or revoke roles, verify a broker, suspend with a reason | Admin |
| Categories | Add, edit, reorder, deactivate categories and subcategories; three-language names, icon, parent, default rate unit, `publish_fee_lkr`, sort order, active toggle | Admin |
| Payments | Bank-slip queue: view the slip image, the claimed reference, the user, the job. Verify or reject with a reason. Verifying publishes the job | Admin |
| Reports | Open reports by target. View the reported content inline. Hide content, dismiss, or suspend the user | Both |
| Ads | CRUD on `ad_placements`, with impression and click counts per placement | Admin |
| Settings | `app_settings` editor: `fees_enabled`, bank details shown to users, job expiry days, maintenance banner | Admin |
| Audit log | Every row of `admin_actions`, filterable by actor and action | Admin |

### Moderation details that save you pain

- **Preset rejection reasons** (`Contact details in the description`, `Rate below legal minimum`, `Unclear job description`, `Wrong category`, `Suspected scam`, `Duplicate posting`) make rejections fast and consistent, and give you analytics on why posts fail.
- **Auto-flag before a human looks.** Run a regex over title and description for phone numbers, email addresses and WhatsApp handles, and surface the match at the top of the review card. People will try to bypass the contact reveal, and this is where you catch them.
- **Verifying a payment must be idempotent.** Two admins clicking Verify on the same slip must not publish the job twice or double-credit anything. Do it in one transaction that checks `status = 'pending'` in the `where` clause of the update.
- **A moderator reviewing their own job is a conflict.** Hide a moderator's own jobs from their queue.

## Payments roadmap

### Stage 1 — bank slip, manually verified

The flow, when `fees_enabled` is true: the publisher finishes the job form → the job saves as `pending_payment` → a page shows your bank details and the exact amount from `categories.publish_fee_lkr`, with a unique reference code → they pay at the bank or by online transfer and upload a photo of the slip → a `payments` row is created as `pending` → an admin opens the queue, compares the slip against the bank statement, and clicks Verify → the job moves to `pending_review` and enters the moderation queue.

Two moderation gates in a row is deliberate: payment verification confirms the money arrived, moderation confirms the content is acceptable. Do not merge them.

Four things to get right:

- **The reference code must be short and unique** — six uppercase alphanumerics, shown large, and repeated in the upload form. Bank transfer narration fields are short and users mistype.
- **Show the exact amount including cents.** It is how you match a deposit to a user when the reference is wrong.
- **Set expectations.** "Verified within 24 hours on working days" on the upload confirmation, and email on both verify and reject.
- **A rejected payment must not delete the job.** It goes back to `pending_payment` so they can re-upload.

### Stage 2 — PayHere card payments

[PayHere](https://www.payhere.lk) is the right gateway: it is a Sri Lankan payment aggregator \<cite index="24-1">approved by the Central Bank, settling to a local LKR business bank account, with APIs, SDKs and plugins\</cite>, supporting \<cite index="21-1">Visa, Mastercard, Amex and local digital wallets\</cite>. Stripe cannot pay out to Sri Lankan accounts, so it is not an option.

Two prerequisites you should start on now because they take weeks, not days: \<cite index="24-1">a Sri Lankan business registration and a business LKR bank account in that business name\</cite>.

Implementation notes:

- Build against the sandbox account first; the integration is the same shape as any hosted-checkout gateway.
- The **IPN webhook is the source of truth**, not the browser redirect. A user closing the tab after paying must still get their job published. Verify the IPN signature, then update `payments.status` in an idempotent transaction keyed on `gateway_ref`.
- Keep `payment_method = 'bank_slip'` working alongside cards. A meaningful share of your users will not have a card, and turning off the bank option would cut them out.
- Add `payment_method = 'waived'` so an admin can publish a job for free (a promotion, a complaint, a test) while keeping one honest audit trail.

### Stage 3 — escrow and broker wages

This is a different product with different risk, and it is where you stop being a listings site and start handling other people's money. Two warnings before any code:

1. **Holding funds on behalf of third parties is a regulated activity.** Get written advice on whether your structure needs Central Bank authorisation, and whether PayHere's terms permit marketplace escrow on their rails. This question gates the whole stage.
2. **Design for the dispute, not the happy path.** The money is held; the work is half-done; the two parties disagree. Who decides, on what evidence, in how many days? Write that policy before you write the schema.

The shape, once those are answered:

- On award, the publisher funds an `escrow_holds` row for the bid's `total_amount` plus your commission.
- Optional `job_milestones` for multi-day work, each releasing a slice.
- The worker or broker marks a milestone done; the publisher confirms, or it auto-confirms after a set window; funds release to the payee's balance.
- A broker's crew lives in `broker_crew`; the broker records a `daily_wage` per worker and `wage_entries` per day worked. At release, the platform shows the broker a payout split. Start by **showing** the split and letting the broker pay their crew themselves — actually disbursing to individual workers multiplies your regulatory and KYC burden.
- Disputes freeze the hold and open an admin case with both parties' evidence attached.

## Homepage and interactive design brief

You asked for a homepage interesting enough that people stay. Be careful what "interactive" means here: a landowner in Kurunegala on a four-year-old Android phone over 3G is not impressed by parallax. What holds that person is **seeing real jobs near them within two seconds**. Design for proof, not for motion.

### Visual direction

Avoid the generic SaaS look — purple gradients and floating glass cards will read as foreign and untrustworthy to this audience. Go earth-toned and confident: deep palm green as the primary, warm sand and clay as supports, near-black text on off-white. Photography of actual plantation and construction work, not stock illustrations of people in offices. Large type, high contrast, 48px minimum tap targets. It should look like it was built in Sri Lanka, for Sri Lankans.

### Section by section

1. **Hero — a search bar, not a slogan.** One headline line, then three controls: category chips (Coconut plucking, Masonry, Carpentry, Land clearing, All), a district select, a Search button. Underneath, live counts rendered server-side: *"142 open jobs · 38 in Kurunegala · Rs. 3,200 average daily rate"*. Real numbers beat any tagline.
2. **The district map.** An inline SVG of the 25 districts, each tinted by open-job count. Hover or tap shows the count and average rate; clicking filters the listing. This is the one genuinely delightful interaction on the page, it is pure data, and it needs no mapping library. Server component with a small client island for the hover.
3. **Live job feed.** Six to eight recent published jobs as cards: photo, title, district, rate, days, bid count, time posted. Personalise by the viewer's district when known. Each card links straight to the detail page.
4. **How it works, two tracks.** A toggle between "I need workers" and "I want work", each showing three steps with a short animation of the actual interface, not abstract icons. The toggle is the interaction; the content is the reassurance.
5. **Rate calculator.** Pick a category, workers, days → see the live average and range from real bid data, with a "Post a job at this rate" button prefilled. Genuinely useful, directly feeds your conversion funnel, and it demonstrates that the marketplace has data in it.
6. **Trust.** Moderated listings, verified phone numbers, ratings on both sides, contact details never shown publicly. State each in one plain sentence.
7. **Categories grid** with job counts, then a short **FAQ** in accordion form, then the footer with the language switcher.

### Behaviour rules

- Everything above renders server-side from real data. If the database is empty on launch day the page must still look intentional — build the empty states deliberately, with a "Be the first to post in your district" call to action.
- A sticky bottom bar on mobile with two buttons: Post a job, Find work. This is where most of your conversion will come from.
- Animation budget: fade-and-rise on scroll, the map hover, the how-it-works toggle. Nothing else. Respect `prefers-reduced-motion`.
- Target under 200 KB of JavaScript and a Largest Contentful Paint under 2.5 seconds on throttled 3G.
- Do not put a chatbot, a cookie wall, or a newsletter popup on this page.

## Localization, location and ads

### Three languages

Use `next-intl` with locale-prefixed routes (`/en`, `/si`, `/ta`) so pages stay server-rendered and indexable. Rules that prevent a painful retrofit:

- **Never hardcode a string in a component.** Not even "Submit". Set up the message files in M1, before any UI exists, and keep a lint rule that fails on literal JSX text.
- **Database content needs columns, not a translation service.** Categories and districts carry `name_en`, `name_si`, `name_ta`. User-written job descriptions are stored and shown as written — do not machine-translate them.
- **Sinhala and Tamil need a font with full glyph coverage.** Noto Sans Sinhala and Noto Sans Tamil, subset and self-hosted. Test rendering on an actual low-end Android phone; this is where it breaks.
- **Dates and numbers** through `Intl`, with LKR formatted as `Rs. 3,500`.
- Store `preferred_lang` on the profile and send notification emails in it.

### Location data

Seed the 25 districts and their 9 provinces, plus a cities list under each. A two-level district → city dropdown is faster on a slow phone than a map picker and works without GPS, so make it the primary input. Add optional browser geolocation that reverse-geocodes to a district and offers to prefill — never as a requirement.

Store `lat`/`lng` on jobs when available, but keep the public display coarse: show a district and an approximate map pin, never a precise pin on a private residence before an award. For "jobs near me", district matching is enough at launch; add PostGIS distance sorting only when a district has enough listings to need it.

### Location-targeted ads

The `ad_placements` table resolves on three keys: slot, district, category. Selection logic: prefer an active ad matching both the viewer's district and the page's category; fall back to district-only; fall back to nationwide; show nothing rather than something irrelevant.

Serve ads from a server component so no ad-tech JavaScript reaches the client. Count an impression server-side when rendered and a click through a `/go/[id]` redirect route that increments and forwards. Mark them visibly as advertisements — on a marketplace where trust is the product, a sponsored listing that looks like a real job will cost you more than the ad earns.

One caution: with a handful of listings per district at launch, ads will outnumber jobs on some pages and the site will look empty and commercial at the same time. Keep ad slots dark until a district has real inventory.

## Repository structure and CLAUDE.md

```
coconnect/
  CLAUDE.md                  <- the file below; Claude Code reads it every session
  docs/
    01-scope.md  02-schema.md  03-rls.md  04-flows.md  05-design.md
  supabase/
    migrations/              <- 0001_schema.sql, 0002_rls.sql, 0003_functions.sql...
    seed.sql                 <- districts, cities, categories, app_settings
  src/
    app/
      [locale]/
        (marketing)/         page.tsx (home), how-it-works, faq
        (auth)/              login, register, verify-phone, reset
        jobs/                page.tsx (listing), [id]/page.tsx, new/, [id]/edit/
        dashboard/           my-jobs/, my-bids/, awarded/, reviews/, settings/
        admin/               moderation/, users/, categories/, payments/,
                             reports/, ads/, settings/, audit/
      api/                   webhooks/payhere/, go/[id]/
    components/
      ui/                    shadcn primitives
      jobs/ bids/ reviews/ admin/ home/
    lib/
      supabase/              client.ts, server.ts, middleware.ts
      validations/           zod schemas, shared with server actions
      sms.ts  email.ts  format.ts
    actions/                 server actions, one file per domain
    i18n/                    en.json, si.json, ta.json
  middleware.ts              <- locale + auth + admin gate
```

### CLAUDE.md

Put this in the repo root before your first build session. It is what stops Claude Code from drifting across a long project.

```markdown
# CoConnect — labour marketplace

Marketplace connecting job publishers with workers and brokers in Sri Lanka.
Coconut plantation and construction work first.

## Stack
Next.js 16 App Router + TypeScript (strict) · Tailwind v4 + shadcn/ui
Supabase (Postgres, Auth, Storage, Realtime) · Vercel · next-intl (en/si/ta)

## Non-negotiable rules
1. A phone number is NEVER returned to a client except through the
   `get_job_contact(job_id)` RPC, which requires an active award.
   Never select `profiles.phone` in application code. Read `public_profiles`.
2. Every table has RLS enabled. A new table without a policy is a bug.
3. Authorisation lives in Postgres (RLS + SECURITY DEFINER functions),
   not in React. Next.js may hide a button; the database decides.
4. No hardcoded user-facing strings. Every string goes through next-intl.
5. Money is `numeric`, never `float`. Currency is LKR. Display as `Rs. 3,500`.
6. Server Components by default. `'use client'` only for real interactivity.
7. All mutations are server actions with Zod validation at the boundary.
8. Never commit `.env*`. Never use the service role key outside
   `src/lib/supabase/server.ts` and webhook handlers.

## Conventions
- Files kebab-case, components PascalCase, DB snake_case.
- Migrations are append-only; never edit an applied migration.
- Every server action returns `{ ok: true, data } | { ok: false, error }`.
- Dates are `timestamptz`; format in the UI, never in the database.

## Commands
npm run dev | build | lint | typecheck
npx supabase db reset   # re-run migrations + seed locally
npx supabase gen types typescript --local > src/lib/database.types.ts

## Before you finish any task
Run `npm run typecheck` and `npm run lint`. Both must pass.
If you added a table, add its RLS policies in the same migration.
If you added a string, add it to all three locale files.
```

## The Claude Code build script

### One session will not work, and you don't need it to

You said you want to build this in one Claude Code session. That will fail, and it is worth knowing why before you start rather than at 70% done. A session has a finite context window. This project is roughly 15,000 lines across 150 files. Long before the end, the early decisions — your schema, your RLS policies, your naming — fall out of context, and the model starts re-inventing them. You get two incompatible halves of an application and a debugging job worse than the build.

The thing you actually want from "one session" is **continuity**: no re-explaining the project every time. You get that from `CLAUDE.md` and the `docs/` folder, not from one long conversation. With those in the repo, every new session starts already knowing the rules.

So: **one session per milestone.** Start fresh, name the milestone, let it work, verify, commit, `/clear`, next. Fifteen clean sessions beat one exhausted one.

### Milestones

| # | Milestone | Done when |
| --- | --- | --- |
| M0 | Repo, Next.js 16, Tailwind, shadcn, Supabase local, CI, CLAUDE.md, docs/ | `npm run dev` serves a styled page; `supabase db reset` runs clean |
| M1 | i18n scaffolding, layout shell, header, footer, language switcher, theme tokens | Three locales route and render; no hardcoded strings |
| M2 | Full schema migration + seed (districts, cities, categories, settings) | `db reset` loads; generated TypeScript types committed |
| M3 | RLS policies, `get_job_contact`, `award_bid`, triggers | A written RLS test script passes for every policy in section 6 |
| M4 | Auth: register, verify email, login, reset, profile completion, phone OTP, roles | A user can sign up, verify a phone, and add the worker role |
| M5 | Job posting: multi-step form, drafts, image upload, EXIF strip, submit | A job reaches `pending_review` with images |
| M6 | Admin shell + moderation queue + approve/reject with reasons | An admin publishes a job; the publisher gets the email |
| M7 | Job listing + filters + search + job detail page | A logged-out visitor finds a job by district and category |
| M8 | Bidding: place, edit, withdraw, publisher bid table, shortlist | Two accounts can bid and the publisher can compare them |
| M9 | Award + contact reveal + state transitions | Award releases both phone numbers and nothing else does |
| M10 | Completion, confirmation, two-way ratings, public review lists | Profile rating updates after a completed job |
| M11 | Q&A threads, comments, reports, report queue | A question is asked, answered and reported end to end |
| M12 | Payments: bank details, slip upload, verification queue, `fees_enabled` flag | Toggling the flag gates posting; verifying publishes |
| M13 | Homepage: hero, district SVG map, live feed, calculator, how-it-works | Lighthouse mobile performance ≥ 90 |
| M14 | Notifications, emails, Sentry, SEO, sitemap, legal pages, production deploy | Live on a domain with real data |

M5–M9 are the product. If you are short on time, cut M13 to a simple hero and ship.

### How to prompt each session

A good milestone prompt has four parts: **what**, **where the spec is**, **the constraints**, **the proof**. Example for M8:

```
Implement M8 (bidding) per docs/01-scope.md and docs/04-flows.md.

Build:
- Bid form on the job detail page: rate, rate unit, workers offered,
  days, message, earliest start date. Zod-validated server action.
- One bid per user per job. Edit and withdraw while status='pending'.
- Publisher bid table at /dashboard/my-jobs/[id]/bids: sortable by
  total, rate and bidder rating; shows each bidder's rating, review
  count and completed jobs; Shortlist action.
- Public job page shows bid count and lowest rate only. No identities.

Constraints:
- Read CLAUDE.md first. Rule 1 and rule 3 apply to every line here.
- Do not expose bidder identity to anyone but the job's publisher.
- Self-bidding is blocked by a DB trigger; the UI must also hide the form.
- All strings through next-intl, all three locale files.

Done when: typecheck and lint pass, and you can describe the exact
RLS policy that stops user A reading user B's bid on a third party's job.
```

That last line matters more than it looks. Asking the model to state the invariant it just implemented catches a whole class of quiet security mistakes.

### Session discipline

- **Verify before you commit.** After each milestone, log in as a second user and try to do the thing that should be forbidden. Read someone else's bid. Fetch a phone number without an award. Approve your own job. Claude Code writes plausible code; only you check that it is correct.
- **Commit at every milestone**, on a branch, with the milestone number in the message. When M9 breaks M5, you need to see what changed.
- **Update `docs/` when a decision changes.** If you move away from this plan, write it down. The docs are what the next session reads.
- **Do not ask for "the whole app" in any prompt.** The more you ask for at once, the more generic the result.
- If a session starts producing code that contradicts `CLAUDE.md`, that is the signal to stop and start a fresh one.

## Launch, costs, compliance and open questions

### Pre-launch checklist

- [ ] Every table has RLS enabled and at least one policy
- [ ] Service role key appears nowhere in client-reachable code
- [ ] `get_job_contact` returns nothing without an award — tested from a second account
- [ ] hCaptcha live on signup, OTP and posting; OTP rate limits configured
- [ ] Database backups on, and a restore actually tested once
- [ ] Sentry capturing server and client errors
- [ ] Privacy policy, terms of service, and a stated data-deletion route
- [ ] Sinhala and Tamil proofread by native speakers, on a real low-end phone
- [ ] Seeded with 20–30 genuine jobs before you tell anyone about it
- [ ] A named person on the moderation queue with a response-time commitment

### Running costs at launch

Supabase and Vercel free tiers carry you through development and early traffic; budget roughly USD 45/month once you outgrow them (Supabase Pro 25, Vercel Pro 20), plus a domain, plus SMS. **SMS is the variable that bites** — at a few cents per OTP it is fine at 100 signups a month and painful at 10,000. Price a local gateway before you promote the site.

### Compliance

- **Sri Lanka's Personal Data Protection Act No. 9 of 2022** applies to you. You are collecting names, phone numbers and locations. You need a lawful basis, a privacy notice, a deletion mechanism, and a breach process. Get this reviewed before launch, not after.
- **Minimum wage.** Agricultural and construction daily wages are regulated by Wages Boards. Decide whether you block postings below the statutory minimum or merely warn. I would warn in stage 1 and block once you have reliable per-category figures — silently hosting illegal wage offers is a reputational and legal risk.
- **You are an intermediary, not an employer.** Say so clearly in the terms, and make sure nothing in the product (especially stage 3 wage management) implies you direct the work.
- **Business registration and a business bank account** are prerequisites for PayHere. Start that paperwork now.

### Open questions I need answers to

1. **Who pays the fee in stage 2** — the publisher to post, or the worker to see the contact? Your brief says publishing fees, but contact-reveal pricing usually converts better in labour marketplaces because the value is proven by then. This changes the stage-2 build.
2. **Can a publisher award more than one bidder?** A job needing 20 workers may be filled by three brokers. Right now `awards` has a unique constraint on `job_id`, which forbids it. Multi-award is a schema change, cheap now and expensive in month four.
3. **What happens when nobody bids?** Auto-expire silently, prompt the publisher to raise the rate, or suggest a rate from live data?
4. **Should workers be able to post "available for work" profiles** that publishers search, i.e. the reverse direction? It doubles the product surface. My advice is no until the job side has liquidity.
5. **Tamil at launch or after?** It affects M1 and your proofreading timeline.
6. **Who is your first district?** Launching nationwide with 30 jobs looks dead everywhere. Launching in one district with 30 jobs looks busy. Pick one coconut-growing district, saturate it, then expand.

Answer 1 and 2 before M2 — both touch the schema.
