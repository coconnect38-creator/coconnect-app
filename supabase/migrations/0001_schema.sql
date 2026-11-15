-- CoConnect stage-1 schema.
-- Deviations from the plan (see docs/00-decisions.md):
--   * multiple awards per job (no unique(job_id) on awards)
--   * reviews are unique per (job, reviewer, reviewee)
--   * extra bookkeeping columns on jobs/bids/awards for the multi-award state machine

create extension if not exists pg_trgm with schema extensions;

-- Deny by default: objects created by postgres in public are NOT automatically
-- readable/executable by anon/authenticated. Every grant below is explicit.
alter default privileges for role postgres in schema public revoke all on tables    from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on functions from anon, authenticated, public;

-- ───────────────────────── Enums ─────────────────────────
create type app_role       as enum ('publisher','worker','broker','moderator','admin');
create type job_status     as enum ('draft','pending_payment','pending_review','published','rejected','awarded','in_progress','completed','cancelled','expired');
create type bid_status     as enum ('pending','shortlisted','accepted','rejected','withdrawn');
create type rate_unit      as enum ('per_worker_per_day','per_day','per_project');
create type payment_status as enum ('pending','verified','rejected');
create type payment_method as enum ('bank_slip','card','waived');
create type thread_kind    as enum ('question','comment');

-- ───────────────────────── Reference data ─────────────────────────
create table districts (
  id       serial primary key,
  slug     text unique not null,
  name_en  text not null, name_si text not null, name_ta text not null,
  province text not null
);

create table cities (
  id          serial primary key,
  district_id int not null references districts(id),
  name_en     text not null, name_si text, name_ta text,
  lat double precision, lng double precision,
  unique (district_id, name_en)
);

create table categories (
  id                serial primary key,
  parent_id         int references categories(id),
  slug              text unique not null,
  name_en text not null, name_si text not null, name_ta text not null,
  icon              text,
  default_rate_unit rate_unit not null default 'per_worker_per_day',
  publish_fee_lkr   numeric(10,2) not null default 0 check (publish_fee_lkr >= 0),
  sort_order        int not null default 0,
  is_active         boolean not null default true
);

-- ───────────────────────── People ─────────────────────────
-- Mirrors auth.users. Created by handle_new_user().
create table profiles (
  id              uuid primary key references auth.users on delete cascade,
  full_name       text not null check (char_length(full_name) between 2 and 80),
  phone           text check (phone ~ '^\+[1-9][0-9]{7,14}$'),   -- E.164, e.g. +94771234567
  phone_verified  boolean not null default false,
  avatar_url      text,
  bio             text check (char_length(bio) <= 1000),
  district_id     int references districts(id),
  city            text,
  lat             double precision,
  lng             double precision,
  preferred_lang  text not null default 'en' check (preferred_lang in ('en','si','ta')),
  is_broker       boolean not null default false,   -- denormalised from user_roles
  broker_verified boolean not null default false,
  crew_size       int check (crew_size > 0),
  rating_avg      numeric(3,2) not null default 0,
  rating_count    int not null default 0,
  jobs_completed  int not null default 0,
  is_suspended    boolean not null default false,
  suspended_reason text,
  created_at      timestamptz not null default now()
);

create table user_roles (
  user_id    uuid references profiles(id) on delete cascade,
  role       app_role not null,
  granted_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

-- ───────────────────────── Jobs ─────────────────────────
create table jobs (
  id               uuid primary key default gen_random_uuid(),
  publisher_id     uuid not null references profiles(id) on delete cascade,
  category_id      int not null references categories(id),
  title            text not null check (char_length(title) between 10 and 120),
  description      text not null check (char_length(description) between 30 and 5000),
  district_id      int not null references districts(id),
  city             text,
  address_hint     text check (char_length(address_hint) <= 120),  -- shown publicly, not a full address
  lat double precision, lng double precision,                    -- rounded to ~1 km by trigger
  workers_needed   int check (workers_needed > 0 and workers_needed <= 1000),
  days_needed      int check (days_needed > 0 and days_needed <= 365),
  suggested_rate   numeric(10,2) not null check (suggested_rate > 0),
  rate_unit        rate_unit not null default 'per_worker_per_day',
  start_date       date,
  is_date_flexible boolean not null default false,
  status           job_status not null default 'draft',
  reject_reason    text,
  reviewed_by      uuid references profiles(id),
  reviewed_at      timestamptz,
  submitted_at     timestamptz,
  published_at     timestamptz,
  expires_at       timestamptz,
  expiry_warned_at timestamptz,
  hiring_closed_at timestamptz,
  cancel_reason    text,
  payment_ref      text unique,                  -- 6-char code for bank narration
  contact_flags    text[] not null default '{}', -- auto-flag matches for moderators
  views_count      int not null default 0,
  bid_count        int not null default 0,       -- active bids only
  lowest_rate      numeric(10,2),                -- lowest active bid in the job's rate unit
  is_featured      boolean not null default false,
  search_text      text generated always as (lower(title || ' ' || description)) stored,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table job_images (
  id           uuid primary key default gen_random_uuid(),
  job_id       uuid not null references jobs(id) on delete cascade,
  storage_path text not null,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now()
);

create table bids (
  id              uuid primary key default gen_random_uuid(),
  job_id          uuid not null references jobs(id) on delete cascade,
  bidder_id       uuid not null references profiles(id) on delete cascade,
  rate            numeric(10,2) not null check (rate > 0),
  rate_unit       rate_unit not null,
  workers_offered int not null default 1 check (workers_offered > 0 and workers_offered <= 1000),
  days_offered    int check (days_offered > 0 and days_offered <= 365),
  total_amount    numeric(12,2) generated always as (
                    rate
                    * case when rate_unit = 'per_worker_per_day' then coalesce(workers_offered,1) else 1 end
                    * case when rate_unit = 'per_project' then 1 else coalesce(days_offered,1) end
                  ) stored,
  message         text check (char_length(message) <= 1000),
  can_start_on    date,
  status          bid_status not null default 'pending',
  auto_rejected   boolean not null default false,  -- rejected because hiring closed; restorable
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (job_id, bidder_id)
);

-- Multi-award: one row per winning bid. A job may have several.
create table awards (
  id                      uuid primary key default gen_random_uuid(),
  job_id                  uuid not null references jobs(id) on delete cascade,
  bid_id                  uuid not null unique references bids(id),
  publisher_id            uuid not null references profiles(id),
  worker_id               uuid not null references profiles(id),
  workers_count           int not null default 1,
  awarded_at              timestamptz not null default now(),
  completion_requested_by uuid references profiles(id),
  completion_requested_at timestamptz,
  completed_at            timestamptz,
  cancelled_at            timestamptz,
  cancelled_by            uuid references profiles(id),
  cancel_reason           text
);

-- ───────────────────────── Social ─────────────────────────
create table reviews (
  id          uuid primary key default gen_random_uuid(),
  job_id      uuid not null references jobs(id) on delete cascade,
  reviewer_id uuid not null references profiles(id) on delete cascade,
  reviewee_id uuid not null references profiles(id) on delete cascade,
  rating      int not null check (rating between 1 and 5),
  comment     text check (char_length(comment) <= 1000),
  is_hidden   boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (job_id, reviewer_id, reviewee_id),
  check (reviewer_id <> reviewee_id)
);

-- Q&A and comments share one threaded table.
create table job_threads (
  id            uuid primary key default gen_random_uuid(),
  job_id        uuid not null references jobs(id) on delete cascade,
  parent_id     uuid references job_threads(id) on delete cascade,
  author_id     uuid not null references profiles(id) on delete cascade,
  kind          thread_kind not null,
  body          text not null check (char_length(body) between 2 and 1000),
  contact_flags text[] not null default '{}',
  is_hidden     boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ───────────────────────── Money ─────────────────────────
create table payments (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(id),
  job_id        uuid references jobs(id) on delete set null,
  amount_lkr    numeric(10,2) not null,
  method        payment_method not null,
  reference     text,                 -- the job's payment_ref at submission time
  slip_path     text,                 -- private storage key
  bank_ref      text,                 -- what the user says the bank narration was
  gateway_ref   text unique,          -- stage 2
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
  target_url  text not null check (target_url ~ '^https?://'),
  district_id int references districts(id),   -- null = nationwide
  category_id int references categories(id),
  slot        text not null check (slot in ('home_hero','listing_inline','job_sidebar')),
  starts_on   date not null,
  ends_on     date not null,
  impressions bigint not null default 0,
  clicks      bigint not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  check (ends_on >= starts_on)
);

-- ───────────────────────── Plumbing ─────────────────────────
create table notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  type       text not null,          -- i18n key under notifications.<type>
  data       jsonb not null default '{}',
  link       text,
  read_at    timestamptz,
  emailed_at timestamptz,
  created_at timestamptz not null default now()
);

create table reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references profiles(id) on delete cascade,
  target_type text not null check (target_type in ('job','profile','thread','review')),
  target_id   uuid not null,
  reason      text not null check (reason in ('spam','scam','contact_info','offensive','wrong_category','other')),
  details     text check (char_length(details) <= 1000),
  status      text not null default 'open' check (status in ('open','actioned','dismissed')),
  resolved_by uuid references profiles(id),
  resolved_at timestamptz,
  created_at  timestamptz not null default now()
);

create table admin_actions (
  id          bigserial primary key,
  actor_id    uuid references profiles(id),
  action      text not null,
  target_type text,
  target_id   text,
  meta        jsonb,
  created_at  timestamptz not null default now()
);

create table app_settings (
  key        text primary key,
  value      jsonb not null,
  is_public  boolean not null default false,
  updated_by uuid references profiles(id),
  updated_at timestamptz not null default now()
);

create table rate_limits (
  id         bigserial primary key,
  user_id    uuid not null references profiles(id) on delete cascade,
  action     text not null,
  created_at timestamptz not null default now()
);

-- A spike here is someone enumerating job ids.
create table contact_lookup_failures (
  id         bigserial primary key,
  user_id    uuid,
  job_id     uuid,
  created_at timestamptz not null default now()
);

-- ───────────────────────── Indexes ─────────────────────────
create index jobs_published_idx   on jobs (published_at desc) where status = 'published';
create index jobs_filter_idx      on jobs (district_id, category_id, status);
create index jobs_publisher_idx   on jobs (publisher_id, created_at desc);
create index jobs_review_idx      on jobs (submitted_at) where status = 'pending_review';
create index jobs_search_idx      on jobs using gin (search_text extensions.gin_trgm_ops);
create index job_images_job_idx   on job_images (job_id, sort_order);
create index bids_job_total_idx   on bids (job_id, total_amount asc);
create index bids_bidder_idx      on bids (bidder_id, created_at desc);
create index awards_job_idx       on awards (job_id);
create index awards_worker_idx    on awards (worker_id);
create index awards_publisher_idx on awards (publisher_id);
create index reviews_reviewee_idx on reviews (reviewee_id, created_at desc);
create index threads_job_idx      on job_threads (job_id, created_at);
create index notifications_user_idx on notifications (user_id, read_at nulls first, created_at desc);
create index payments_status_idx  on payments (status, created_at);
create index payments_job_idx     on payments (job_id);
create index reports_status_idx   on reports (status, created_at);
create index rate_limits_idx      on rate_limits (user_id, action, created_at desc);
create index admin_actions_idx    on admin_actions (created_at desc);
create index cities_district_idx  on cities (district_id);
