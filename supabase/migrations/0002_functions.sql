-- Helpers, triggers and RPCs. Every state transition in the product is one of
-- these functions; clients have no direct UPDATE on status columns.
-- Errors are raised as short codes; the app maps them to errors.<code>.

-- ───────────────────────── Role / ownership helpers ─────────────────────────
-- SECURITY DEFINER so RLS policies can call them without recursing into each other.

create or replace function has_role(p_role app_role) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from user_roles where user_id = auth.uid() and role = p_role);
$$;

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from user_roles where user_id = auth.uid() and role = 'admin');
$$;

create or replace function is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from user_roles where user_id = auth.uid() and role in ('admin','moderator'));
$$;

create or replace function is_job_owner(p_job_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from jobs where id = p_job_id and publisher_id = auth.uid());
$$;

create or replace function is_job_bidder(p_job_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from bids where job_id = p_job_id and bidder_id = auth.uid());
$$;

create or replace function is_active_user() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and not is_suspended);
$$;

-- A completed award between reviewer (caller) and reviewee on this job.
create or replace function can_review(p_job_id uuid, p_reviewee uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from awards a
    where a.job_id = p_job_id
      and a.completed_at is not null
      and a.cancelled_at is null
      and (   (a.publisher_id = auth.uid() and a.worker_id    = p_reviewee)
           or (a.worker_id    = auth.uid() and a.publisher_id = p_reviewee))
  );
$$;

create or replace function setting(p_key text) returns jsonb
language sql stable security definer set search_path = public as $$
  select value from app_settings where key = p_key;
$$;

-- ───────────────────────── Internal utilities ─────────────────────────

create or replace function notify(p_user uuid, p_type text, p_data jsonb default '{}', p_link text default null)
returns void language sql security definer set search_path = public as $$
  insert into notifications (user_id, type, data, link) values (p_user, p_type, coalesce(p_data,'{}'), p_link);
$$;

create or replace function log_admin(p_action text, p_target_type text, p_target_id text, p_meta jsonb default null)
returns void language sql security definer set search_path = public as $$
  insert into admin_actions (actor_id, action, target_type, target_id, meta)
  values (auth.uid(), p_action, p_target_type, p_target_id, p_meta);
$$;

create or replace function enforce_rate_limit(p_action text, p_max int, p_window interval default interval '1 day')
returns void language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from rate_limits
      where user_id = auth.uid() and action = p_action and created_at > now() - p_window) >= p_max then
    raise exception 'rate_limited';
  end if;
  insert into rate_limits (user_id, action) values (auth.uid(), p_action);
end $$;

-- Ensures the caller is signed in and not suspended.
create or replace function require_active_user() returns uuid
language plpgsql stable security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if not exists (select 1 from profiles where id = v_uid and not is_suspended) then
    raise exception 'account_suspended';
  end if;
  return v_uid;
end $$;

create or replace function require_phone() returns void
language plpgsql stable security definer set search_path = public as $$
declare v_phone text; v_verified boolean;
begin
  select phone, phone_verified into v_phone, v_verified from profiles where id = auth.uid();
  if v_phone is null then raise exception 'phone_required'; end if;
  if coalesce((setting('require_phone_verification'))::boolean, false) and not v_verified then
    raise exception 'phone_unverified';
  end if;
end $$;

-- Phone numbers, emails and messenger handles people use to bypass the contact reveal.
create or replace function detect_contact_info(p_text text) returns text[]
language sql immutable set search_path = public as $$
  select coalesce(array_agg(distinct m), '{}') from (
    select 'phone:' || regexp_replace(x[1], '[^0-9+]', '', 'g') as m
      from regexp_matches(coalesce(p_text,''), '((?:\+|00)?[0-9][0-9 ().-]{7,}[0-9])', 'g') as x
      where length(regexp_replace(x[1], '[^0-9]', '', 'g')) between 9 and 13
    union all
    select 'email:' || lower(x[1])
      from regexp_matches(coalesce(p_text,''), '([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})', 'g') as x
    union all
    select 'messenger:' || lower(x[1])
      from regexp_matches(coalesce(p_text,''), '(whats\s*app|wa\.me|viber|telegram|t\.me/|\mimo\M|signal)', 'gi') as x
  ) s;
$$;

create or replace function new_payment_ref() returns text
language plpgsql volatile set search_path = public as $$
declare
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_ref text;
begin
  loop
    v_ref := '';
    for i in 1..6 loop
      v_ref := v_ref || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from jobs where payment_ref = v_ref);
  end loop;
  return v_ref;
end $$;

-- ───────────────────────── Triggers ─────────────────────────

-- 1. handle_new_user: profile + default publisher/worker roles.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_name text := nullif(trim(new.raw_user_meta_data->>'full_name'), '');
  v_lang text := new.raw_user_meta_data->>'preferred_lang';
begin
  if v_name is null or char_length(v_name) < 2 then
    v_name := coalesce(split_part(new.email, '@', 1), 'Member');
    if char_length(v_name) < 2 then v_name := 'Member'; end if;
  end if;
  insert into profiles (id, full_name, preferred_lang, phone, phone_verified)
  values (
    new.id,
    left(v_name, 80),
    case when v_lang in ('en','si','ta') then v_lang else 'en' end,
    case when new.phone is not null and new.phone <> '' then '+' || ltrim(new.phone, '+') end,
    new.phone_confirmed_at is not null
  );
  insert into user_roles (user_id, role) values (new.id, 'publisher'), (new.id, 'worker');
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users for each row execute function handle_new_user();

-- Phone verification happens through Supabase Auth OTP (updateUser({phone}) +
-- verifyOtp type 'phone_change'); mirror the confirmed number onto the profile.
create or replace function handle_auth_phone_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.phone is not null and new.phone <> '' and new.phone_confirmed_at is not null then
    update profiles
       set phone = '+' || ltrim(new.phone, '+'), phone_verified = true
     where id = new.id;
  end if;
  return new;
end $$;

create trigger on_auth_user_phone_changed
  after update of phone, phone_confirmed_at on auth.users
  for each row execute function handle_auth_phone_change();

-- A user editing their own phone column always un-verifies it.
create or replace function profiles_before_update() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.phone is distinct from old.phone and new.phone_verified = old.phone_verified then
    new.phone_verified := false;
  end if;
  return new;
end $$;

create trigger profiles_before_update before update on profiles
  for each row execute function profiles_before_update();

-- Keep profiles.is_broker in step with the broker role row.
create or replace function sync_is_broker() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' and new.role = 'broker' then
    update profiles set is_broker = true where id = new.user_id;
  elsif tg_op = 'DELETE' and old.role = 'broker' then
    update profiles set is_broker = false, broker_verified = false where id = old.user_id;
  end if;
  return null;
end $$;

create trigger user_roles_sync_broker after insert or delete on user_roles
  for each row execute function sync_is_broker();

-- 6. touch_updated_at
create or replace function touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger jobs_touch    before update on jobs        for each row execute function touch_updated_at();
create trigger bids_touch    before update on bids        for each row execute function touch_updated_at();
create trigger threads_touch before update on job_threads for each row execute function touch_updated_at();

-- Coarse location and auto-flags on every job write.
create or replace function jobs_before_write() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.lat is not null then new.lat := round(new.lat::numeric, 2)::double precision; end if;
  if new.lng is not null then new.lng := round(new.lng::numeric, 2)::double precision; end if;
  if tg_op = 'INSERT' or new.title is distinct from old.title
     or new.description is distinct from old.description or new.address_hint is distinct from old.address_hint then
    new.contact_flags := detect_contact_info(new.title || ' ' || new.description || ' ' || coalesce(new.address_hint,''));
  end if;
  return new;
end $$;

create trigger jobs_before_write before insert or update on jobs
  for each row execute function jobs_before_write();

create or replace function threads_before_write() returns trigger
language plpgsql set search_path = public as $$
begin
  new.contact_flags := detect_contact_info(new.body);
  if tg_op = 'INSERT' and new.parent_id is not null then
    if not exists (select 1 from job_threads where id = new.parent_id and job_id = new.job_id) then
      raise exception 'thread_parent_mismatch';
    end if;
  end if;
  return new;
end $$;

create trigger threads_before_write before insert or update of body on job_threads
  for each row execute function threads_before_write();

create or replace function job_images_limit() returns trigger
language plpgsql set search_path = public as $$
begin
  if (select count(*) from job_images where job_id = new.job_id) >= 5 then
    raise exception 'too_many_images';
  end if;
  return new;
end $$;

create trigger job_images_limit before insert on job_images
  for each row execute function job_images_limit();

-- 2. prevent_self_bid
create or replace function prevent_self_bid() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from jobs where id = new.job_id and publisher_id = new.bidder_id) then
    raise exception 'self_bid';
  end if;
  return new;
end $$;

create trigger bids_prevent_self before insert or update of bidder_id, job_id on bids
  for each row execute function prevent_self_bid();

-- 5. lock_bids_after_award: no new or changed bids unless the job is open.
-- Status-only moves to rejected/withdrawn are always allowed (closing, expiry, withdrawal).
create or replace function lock_bids_after_award() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_status job_status;
begin
  select status into v_status from jobs where id = new.job_id;
  if v_status = 'published' then return new; end if;
  if tg_op = 'UPDATE'
     and new.status in ('rejected','withdrawn')
     and (new.rate, new.rate_unit, new.workers_offered, new.days_offered, new.message, new.can_start_on)
         is not distinct from
         (old.rate, old.rate_unit, old.workers_offered, old.days_offered, old.message, old.can_start_on) then
    return new;
  end if;
  raise exception 'job_not_open';
end $$;

create trigger bids_lock before insert or update on bids
  for each row execute function lock_bids_after_award();

-- 3. bump_bid_count: active-bid count and lowest rate on the job.
create or replace function bump_bid_count() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_job uuid := coalesce(new.job_id, old.job_id);
begin
  update jobs j set
    bid_count = (select count(*) from bids b
                 where b.job_id = v_job and b.status in ('pending','shortlisted','accepted')),
    lowest_rate = (select min(b.rate) from bids b
                   where b.job_id = v_job and b.status in ('pending','shortlisted','accepted')
                     and b.rate_unit = j.rate_unit)
  where j.id = v_job;
  return null;
end $$;

create trigger bids_count after insert or update of status, rate, rate_unit or delete on bids
  for each row execute function bump_bid_count();

-- 4. recalc_rating
create or replace function recalc_rating() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_user uuid := coalesce(new.reviewee_id, old.reviewee_id);
begin
  update profiles p set
    rating_avg   = coalesce((select round(avg(rating)::numeric, 2) from reviews where reviewee_id = v_user and not is_hidden), 0),
    rating_count = (select count(*) from reviews where reviewee_id = v_user and not is_hidden)
  where p.id = v_user;
  if tg_op = 'INSERT' then
    perform notify(new.reviewee_id, 'review_received',
                   jsonb_build_object('rating', new.rating, 'job_id', new.job_id),
                   '/profile/' || new.reviewee_id);
  end if;
  return null;
end $$;

create trigger reviews_rating after insert or update of rating, is_hidden or delete on reviews
  for each row execute function recalc_rating();

-- Q&A notifications.
create or replace function threads_after_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_owner uuid; v_title text; v_parent_author uuid;
begin
  select publisher_id, title into v_owner, v_title from jobs where id = new.job_id;
  if v_owner <> new.author_id then
    perform notify(v_owner, 'question_received', jsonb_build_object('job_title', v_title), '/jobs/' || new.job_id);
  end if;
  if new.parent_id is not null then
    select author_id into v_parent_author from job_threads where id = new.parent_id;
    if v_parent_author <> new.author_id and v_parent_author <> v_owner then
      perform notify(v_parent_author, 'reply_received', jsonb_build_object('job_title', v_title), '/jobs/' || new.job_id);
    end if;
  end if;
  return null;
end $$;

create trigger threads_after_insert after insert on job_threads
  for each row execute function threads_after_insert();

-- Admin-managed tables: every write is audited.
create or replace function audit_admin_table() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into admin_actions (actor_id, action, target_type, target_id, meta)
  values (auth.uid(), lower(tg_op), tg_table_name,
          coalesce((to_jsonb(new)->>'id'), (to_jsonb(old)->>'id'), (to_jsonb(new)->>'key')),
          jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new)));
  return null;
end $$;

create trigger categories_audit    after insert or update or delete on categories    for each row execute function audit_admin_table();
create trigger ad_placements_audit after insert or update or delete on ad_placements for each row execute function audit_admin_table();
create trigger app_settings_audit  after insert or update or delete on app_settings  for each row execute function audit_admin_table();

-- ───────────────────────── Account RPCs ─────────────────────────

create or replace function add_my_role(p_role app_role) returns void
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := require_active_user();
begin
  if p_role not in ('publisher','worker','broker') then raise exception 'role_not_self_service'; end if;
  insert into user_roles (user_id, role) values (v_uid, p_role) on conflict do nothing;
  -- A broker is always also a worker.
  if p_role = 'broker' then
    insert into user_roles (user_id, role) values (v_uid, 'worker') on conflict do nothing;
  end if;
end $$;

create or replace function remove_my_role(p_role app_role) returns void
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := require_active_user();
begin
  if p_role not in ('publisher','worker','broker') then raise exception 'role_not_self_service'; end if;
  if p_role = 'worker' and exists (select 1 from user_roles where user_id = v_uid and role = 'broker') then
    raise exception 'broker_requires_worker';
  end if;
  if (select count(*) from user_roles where user_id = v_uid and role in ('publisher','worker','broker')) <= 1 then
    raise exception 'last_role';
  end if;
  delete from user_roles where user_id = v_uid and role = p_role;
end $$;

create or replace function mark_notifications_read(p_ids uuid[] default null) returns void
language sql security definer set search_path = public as $$
  update notifications set read_at = now()
   where user_id = auth.uid() and read_at is null and (p_ids is null or id = any(p_ids));
$$;

-- ───────────────────────── Job lifecycle RPCs ─────────────────────────

-- draft/rejected → pending_payment | pending_review
create or replace function submit_job(p_job_id uuid) returns job_status
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := require_active_user();
  v_job jobs;
  v_fee numeric;
  v_paid boolean;
  v_next job_status;
begin
  select * into v_job from jobs where id = p_job_id for update;
  if not found or v_job.publisher_id <> v_uid then raise exception 'not_found'; end if;
  if v_job.status not in ('draft','rejected') then raise exception 'invalid_state'; end if;
  if not has_role('publisher') then raise exception 'role_required'; end if;
  perform require_phone();
  if not exists (select 1 from categories where id = v_job.category_id and is_active) then
    raise exception 'category_inactive';
  end if;
  if v_job.submitted_at is null then perform enforce_rate_limit('job_submit', 5); end if;

  select publish_fee_lkr into v_fee from categories where id = v_job.category_id;
  v_paid := exists (select 1 from payments where job_id = p_job_id and status = 'verified');

  if coalesce((setting('fees_enabled'))::boolean, false) and v_fee > 0 and not v_paid then
    v_next := 'pending_payment';
  else
    v_next := 'pending_review';
  end if;

  update jobs set
    status = v_next,
    submitted_at = now(),
    reject_reason = null,
    payment_ref = case when v_next = 'pending_payment' then coalesce(payment_ref, new_payment_ref()) else payment_ref end
  where id = p_job_id;
  return v_next;
end $$;

create or replace function cancel_job(p_job_id uuid, p_reason text default null) returns void
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := require_active_user(); v_job jobs;
begin
  select * into v_job from jobs where id = p_job_id for update;
  if not found or v_job.publisher_id <> v_uid then raise exception 'not_found'; end if;
  if v_job.status not in ('draft','pending_payment','pending_review','published','rejected') then
    raise exception 'invalid_state';
  end if;
  if exists (select 1 from awards where job_id = p_job_id and cancelled_at is null) then
    raise exception 'has_active_awards';
  end if;
  update bids set status = 'rejected' where job_id = p_job_id and status in ('pending','shortlisted');
  update jobs set status = 'cancelled', cancel_reason = left(p_reason, 500) where id = p_job_id;
end $$;

create or replace function record_job_view(p_job_id uuid) returns void
language sql security definer set search_path = public as $$
  update jobs set views_count = views_count + 1 where id = p_job_id and status = 'published';
$$;

-- ───────────────────────── Bidding RPCs ─────────────────────────

-- Insert, edit (while pending) or re-activate (after withdrawal) the caller's bid.
create or replace function place_bid(
  p_job_id uuid, p_rate numeric, p_rate_unit rate_unit, p_workers int default 1,
  p_days int default null, p_message text default null, p_can_start_on date default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := require_active_user();
  v_job jobs;
  v_bid bids;
  v_id uuid;
begin
  select * into v_job from jobs where id = p_job_id;
  if not found then raise exception 'not_found'; end if;
  if v_job.publisher_id = v_uid then raise exception 'self_bid'; end if;
  if v_job.status <> 'published' or v_job.hiring_closed_at is not null then raise exception 'job_not_open'; end if;
  if not has_role('worker') then raise exception 'role_required'; end if;
  if coalesce(p_workers, 1) > 1 and not has_role('broker') then raise exception 'broker_required'; end if;
  perform require_phone();

  select * into v_bid from bids where job_id = p_job_id and bidder_id = v_uid for update;
  if not found then
    perform enforce_rate_limit('bid', 30);
    insert into bids (job_id, bidder_id, rate, rate_unit, workers_offered, days_offered, message, can_start_on)
    values (p_job_id, v_uid, p_rate, p_rate_unit, coalesce(p_workers,1), p_days, nullif(trim(p_message),''), p_can_start_on)
    returning id into v_id;
    perform notify(v_job.publisher_id, 'bid_received',
                   jsonb_build_object('job_title', v_job.title, 'rate', p_rate),
                   '/dashboard/my-jobs/' || p_job_id);
    return v_id;
  end if;

  if v_bid.status not in ('pending','withdrawn') then raise exception 'bid_locked'; end if;
  update bids set
    rate = p_rate, rate_unit = p_rate_unit, workers_offered = coalesce(p_workers,1),
    days_offered = p_days, message = nullif(trim(p_message),''), can_start_on = p_can_start_on,
    status = 'pending', auto_rejected = false
  where id = v_bid.id;
  return v_bid.id;
end $$;

create or replace function withdraw_bid(p_bid_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := require_active_user();
begin
  update bids set status = 'withdrawn'
   where id = p_bid_id and bidder_id = v_uid and status in ('pending','shortlisted');
  if not found then raise exception 'bid_locked'; end if;
end $$;

create or replace function set_bid_shortlisted(p_bid_id uuid, p_value boolean) returns void
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := require_active_user(); v_bid bids; v_title text;
begin
  select b.* into v_bid from bids b join jobs j on j.id = b.job_id
   where b.id = p_bid_id and j.publisher_id = v_uid and j.status = 'published';
  if not found then raise exception 'not_found'; end if;
  if p_value and v_bid.status = 'pending' then
    update bids set status = 'shortlisted' where id = p_bid_id;
    select title into v_title from jobs where id = v_bid.job_id;
    perform notify(v_bid.bidder_id, 'bid_shortlisted', jsonb_build_object('job_title', v_title), '/jobs/' || v_bid.job_id);
  elsif not p_value and v_bid.status = 'shortlisted' then
    update bids set status = 'pending' where id = p_bid_id;
  else
    raise exception 'invalid_state';
  end if;
end $$;

-- ───────────────────────── Award RPCs (multi-award) ─────────────────────────

-- Internal: stop hiring. Remaining open bids are auto-rejected (restorable).
create or replace function _close_hiring(p_job_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_title text; v_bidder uuid;
begin
  select title into v_title from jobs where id = p_job_id;
  -- Bids first, while the job is still 'published'.
  for v_bidder in
    update bids set status = 'rejected', auto_rejected = true
     where job_id = p_job_id and status in ('pending','shortlisted')
    returning bidder_id
  loop
    perform notify(v_bidder, 'bid_closed', jsonb_build_object('job_title', v_title), '/jobs/' || p_job_id);
  end loop;
  update jobs set status = 'in_progress', hiring_closed_at = now() where id = p_job_id;
  perform _maybe_complete_job(p_job_id);
end $$;

-- Internal: a hiring-closed job is completed when no active award is unfinished.
create or replace function _maybe_complete_job(p_job_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update jobs j set status = 'completed'
   where j.id = p_job_id
     and j.status = 'in_progress'
     and j.hiring_closed_at is not null
     and exists (select 1 from awards a where a.job_id = j.id and a.cancelled_at is null)
     and not exists (select 1 from awards a where a.job_id = j.id and a.cancelled_at is null and a.completed_at is null);
end $$;

-- One transaction: verify, insert award, accept bid, maybe close hiring, notify.
-- Hiring closes automatically once awarded workers cover workers_needed
-- (or on the first award when workers_needed is unset).
create or replace function award_bid(p_bid_id uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := require_active_user();
  v_bid bids;
  v_job jobs;
  v_award uuid;
  v_filled int;
begin
  select * into v_bid from bids where id = p_bid_id;
  if not found then raise exception 'not_found'; end if;
  select * into v_job from jobs where id = v_bid.job_id for update;  -- serialises concurrent awards
  if v_job.publisher_id <> v_uid then raise exception 'not_found'; end if;
  if v_job.status <> 'published' or v_job.hiring_closed_at is not null then raise exception 'job_not_open'; end if;
  select * into v_bid from bids where id = p_bid_id for update;
  if v_bid.status not in ('pending','shortlisted') then raise exception 'bid_not_awardable'; end if;
  if exists (select 1 from profiles where id = v_bid.bidder_id and is_suspended) then
    raise exception 'bidder_suspended';
  end if;

  insert into awards (job_id, bid_id, publisher_id, worker_id, workers_count)
  values (v_job.id, v_bid.id, v_job.publisher_id, v_bid.bidder_id, v_bid.workers_offered)
  returning id into v_award;

  update bids set status = 'accepted', auto_rejected = false where id = v_bid.id;

  perform notify(v_bid.bidder_id, 'bid_awarded', jsonb_build_object('job_title', v_job.title), '/jobs/' || v_job.id);

  select coalesce(sum(workers_count), 0) into v_filled
    from awards where job_id = v_job.id and cancelled_at is null;
  if v_job.workers_needed is null or v_filled >= v_job.workers_needed then
    perform _close_hiring(v_job.id);
  end if;
  return v_award;
end $$;

-- Publisher stops hiring early with the awards they have.
create or replace function close_hiring(p_job_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := require_active_user(); v_job jobs;
begin
  select * into v_job from jobs where id = p_job_id for update;
  if not found or v_job.publisher_id <> v_uid then raise exception 'not_found'; end if;
  if v_job.status <> 'published' then raise exception 'invalid_state'; end if;
  if not exists (select 1 from awards where job_id = p_job_id and cancelled_at is null) then
    raise exception 'no_active_awards';
  end if;
  perform _close_hiring(p_job_id);
end $$;

-- Either party cancels an unfinished award. If hiring had closed, the job reopens
-- with its auto-rejected bids restored.
create or replace function cancel_award(p_award_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := require_active_user();
  v_award awards;
  v_job jobs;
  v_other uuid;
begin
  if p_reason is null or char_length(trim(p_reason)) < 3 then raise exception 'reason_required'; end if;
  select * into v_award from awards where id = p_award_id;
  if not found or v_uid not in (v_award.publisher_id, v_award.worker_id) then raise exception 'not_found'; end if;
  select * into v_job from jobs where id = v_award.job_id for update;
  select * into v_award from awards where id = p_award_id for update;
  if v_award.cancelled_at is not null or v_award.completed_at is not null then raise exception 'invalid_state'; end if;

  update awards set cancelled_at = now(), cancelled_by = v_uid, cancel_reason = left(trim(p_reason), 500)
   where id = p_award_id;
  update bids set status = 'rejected', auto_rejected = false where id = v_award.bid_id;

  if v_job.status = 'in_progress' then
    update jobs set
      status = 'published',
      hiring_closed_at = null,
      expires_at = greatest(coalesce(expires_at, now()), now() + interval '7 days')
    where id = v_job.id;
    update bids set status = 'pending', auto_rejected = false
     where job_id = v_job.id and status = 'rejected' and auto_rejected;
  end if;

  v_other := case when v_uid = v_award.publisher_id then v_award.worker_id else v_award.publisher_id end;
  perform notify(v_other, 'award_cancelled', jsonb_build_object('job_title', v_job.title, 'reason', left(trim(p_reason), 200)),
                 '/jobs/' || v_job.id);
end $$;

-- First call by a party requests completion; the other party's call confirms.
-- Unconfirmed requests auto-confirm after 7 days (auto_confirm_completions).
create or replace function _complete_award(p_award_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_award awards;
begin
  update awards set completed_at = now()
   where id = p_award_id and completed_at is null and cancelled_at is null
  returning * into v_award;
  if not found then return; end if;
  update profiles set jobs_completed = jobs_completed + 1 where id = v_award.worker_id;
  perform notify(v_award.publisher_id, 'review_prompt', jsonb_build_object('job_id', v_award.job_id), '/jobs/' || v_award.job_id);
  perform notify(v_award.worker_id,    'review_prompt', jsonb_build_object('job_id', v_award.job_id), '/jobs/' || v_award.job_id);
  perform _maybe_complete_job(v_award.job_id);
end $$;

create or replace function mark_award_complete(p_award_id uuid) returns text
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := require_active_user(); v_award awards; v_title text;
begin
  select * into v_award from awards where id = p_award_id for update;
  if not found or v_uid not in (v_award.publisher_id, v_award.worker_id) then raise exception 'not_found'; end if;
  if v_award.cancelled_at is not null then raise exception 'invalid_state'; end if;
  if v_award.completed_at is not null then return 'completed'; end if;

  if v_award.completion_requested_by is null then
    update awards set completion_requested_by = v_uid, completion_requested_at = now() where id = p_award_id;
    select title into v_title from jobs where id = v_award.job_id;
    perform notify(case when v_uid = v_award.publisher_id then v_award.worker_id else v_award.publisher_id end,
                   'completion_requested', jsonb_build_object('job_title', v_title), '/jobs/' || v_award.job_id);
    return 'requested';
  elsif v_award.completion_requested_by = v_uid then
    return 'requested';
  else
    perform _complete_award(p_award_id);
    return 'completed';
  end if;
end $$;

-- Layer 3 of phone protection: the only path from a client to another user's number.
create or replace function get_job_contact(p_job_id uuid)
returns table (user_id uuid, full_name text, phone text, counterpart text, award_id uuid, workers_count int)
language plpgsql security definer set search_path = public as $$
begin
  return query
  select p.id, p.full_name, p.phone,
         case when a.publisher_id = auth.uid() then 'worker' else 'publisher' end,
         a.id, a.workers_count
  from awards a
  join profiles p on p.id = case
        when a.publisher_id = auth.uid() then a.worker_id
        when a.worker_id    = auth.uid() then a.publisher_id
      end
  where a.job_id = p_job_id
    and a.cancelled_at is null
    and auth.uid() in (a.publisher_id, a.worker_id)
  order by a.awarded_at;

  if not found then
    insert into contact_lookup_failures (user_id, job_id) values (auth.uid(), p_job_id);
  end if;
end $$;

-- ───────────────────────── Payments RPCs ─────────────────────────

create or replace function submit_payment_slip(p_job_id uuid, p_slip_path text, p_bank_ref text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := require_active_user(); v_job jobs; v_fee numeric; v_id uuid;
begin
  select * into v_job from jobs where id = p_job_id for update;
  if not found or v_job.publisher_id <> v_uid then raise exception 'not_found'; end if;
  if v_job.status <> 'pending_payment' then raise exception 'invalid_state'; end if;
  if p_slip_path is null or split_part(p_slip_path, '/', 1) <> v_uid::text then raise exception 'invalid_slip'; end if;
  if exists (select 1 from payments where job_id = p_job_id and status = 'pending') then
    raise exception 'payment_already_pending';
  end if;
  select publish_fee_lkr into v_fee from categories where id = v_job.category_id;
  insert into payments (user_id, job_id, amount_lkr, method, reference, slip_path, bank_ref)
  values (v_uid, p_job_id, v_fee, 'bank_slip', v_job.payment_ref, p_slip_path, left(trim(p_bank_ref), 60))
  returning id into v_id;
  return v_id;
end $$;

-- ───────────────────────── Public stats (aggregates only) ─────────────────────────

create or replace function get_home_stats(p_district_id int default null)
returns table (open_jobs bigint, district_jobs bigint, avg_daily_rate numeric)
language sql stable security definer set search_path = public as $$
  select
    count(*),
    count(*) filter (where district_id = p_district_id),
    round(avg(suggested_rate) filter (where rate_unit = 'per_worker_per_day'), 0)
  from jobs where status = 'published';
$$;

create or replace function get_district_stats()
returns table (district_id int, open_jobs bigint, avg_daily_rate numeric)
language sql stable security definer set search_path = public as $$
  select d.id, count(j.id),
         round(avg(j.suggested_rate) filter (where j.rate_unit = 'per_worker_per_day'), 0)
  from districts d
  left join jobs j on j.district_id = d.id and j.status = 'published'
  group by d.id;
$$;

create or replace function get_category_counts()
returns table (category_id int, open_jobs bigint)
language sql stable security definer set search_path = public as $$
  select c.id, count(j.id)
  from categories c
  left join categories child on child.parent_id = c.id
  left join jobs j on j.status = 'published' and (j.category_id = c.id or j.category_id = child.id)
  where c.is_active
  group by c.id;
$$;

-- Rate calculator. Bid aggregates are only released with >= 3 samples so a
-- single bidder's rate can't be inferred.
create or replace function get_rate_stats(p_category_id int, p_district_id int default null)
returns table (bid_samples bigint, bid_avg numeric, bid_low numeric, bid_high numeric,
               job_samples bigint, job_avg numeric)
language plpgsql stable security definer set search_path = public as $$
declare v_cats int[];
begin
  select array_agg(id) into v_cats from categories where id = p_category_id or parent_id = p_category_id;
  return query
  with b as (
    select bd.rate from bids bd join jobs j on j.id = bd.job_id
    where j.category_id = any(v_cats) and bd.rate_unit = 'per_worker_per_day'
      and bd.status <> 'withdrawn'
      and (p_district_id is null or j.district_id = p_district_id)
  ), jj as (
    select suggested_rate from jobs
    where category_id = any(v_cats) and rate_unit = 'per_worker_per_day'
      and status in ('published','in_progress','completed','expired')
      and (p_district_id is null or district_id = p_district_id)
  )
  select
    (select count(*) from b),
    case when (select count(*) from b) >= 3 then (select round(avg(rate), 0) from b) end,
    case when (select count(*) from b) >= 3 then (select round(percentile_cont(0.1) within group (order by rate)::numeric, 0) from b) end,
    case when (select count(*) from b) >= 3 then (select round(percentile_cont(0.9) within group (order by rate)::numeric, 0) from b) end,
    (select count(*) from jj),
    (select round(avg(suggested_rate), 0) from jj);
end $$;

-- ───────────────────────── Ads ─────────────────────────

create or replace function record_ad_impressions(p_ids uuid[]) returns void
language sql security definer set search_path = public as $$
  update ad_placements set impressions = impressions + 1 where id = any(p_ids) and is_active;
$$;

create or replace function record_ad_click(p_id uuid) returns text
language sql security definer set search_path = public as $$
  update ad_placements set clicks = clicks + 1 where id = p_id and is_active returning target_url;
$$;

-- ───────────────────────── Staff / admin RPCs ─────────────────────────

create or replace function require_staff() returns uuid
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_staff() then raise exception 'forbidden'; end if;
  return auth.uid();
end $$;

create or replace function require_admin() returns uuid
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  return auth.uid();
end $$;

create or replace function admin_review_job(p_job_id uuid, p_approve boolean, p_reason text default null) returns void
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := require_staff(); v_job jobs; v_days int;
begin
  select * into v_job from jobs where id = p_job_id for update;
  if not found then raise exception 'not_found'; end if;
  if v_job.publisher_id = v_uid then raise exception 'own_job'; end if;
  if v_job.status <> 'pending_review' then raise exception 'invalid_state'; end if;

  if p_approve then
    v_days := coalesce((setting('job_expiry_days'))::int, 30);
    update jobs set status = 'published', published_at = now(), expires_at = now() + make_interval(days => v_days),
                    reviewed_by = v_uid, reviewed_at = now(), reject_reason = null, expiry_warned_at = null
     where id = p_job_id;
    perform notify(v_job.publisher_id, 'job_approved', jsonb_build_object('job_title', v_job.title), '/jobs/' || p_job_id);
  else
    if p_reason is null or char_length(trim(p_reason)) < 3 then raise exception 'reason_required'; end if;
    update jobs set status = 'rejected', reject_reason = left(trim(p_reason), 1000),
                    reviewed_by = v_uid, reviewed_at = now()
     where id = p_job_id;
    perform notify(v_job.publisher_id, 'job_rejected',
                   jsonb_build_object('job_title', v_job.title, 'reason', left(trim(p_reason), 300)),
                   '/dashboard/my-jobs/' || p_job_id);
  end if;
  perform log_admin(case when p_approve then 'job.approve' else 'job.reject' end, 'job', p_job_id::text,
                    jsonb_build_object('reason', p_reason));
end $$;

create or replace function admin_set_job_featured(p_job_id uuid, p_value boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform require_staff();
  update jobs set is_featured = p_value where id = p_job_id;
  if not found then raise exception 'not_found'; end if;
  perform log_admin('job.feature', 'job', p_job_id::text, jsonb_build_object('value', p_value));
end $$;

create or replace function admin_extend_job(p_job_id uuid, p_days int) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform require_staff();
  if p_days not between 1 and 90 then raise exception 'invalid_input'; end if;
  update jobs set expires_at = greatest(coalesce(expires_at, now()), now()) + make_interval(days => p_days),
                  expiry_warned_at = null,
                  status = case when status = 'expired' then 'published'::job_status else status end
   where id = p_job_id and status in ('published','expired');
  if not found then raise exception 'invalid_state'; end if;
  perform log_admin('job.extend', 'job', p_job_id::text, jsonb_build_object('days', p_days));
end $$;

-- Force-unpublish returns the job to the publisher as rejected so they can fix it.
create or replace function admin_unpublish_job(p_job_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare v_job jobs;
begin
  perform require_staff();
  if p_reason is null or char_length(trim(p_reason)) < 3 then raise exception 'reason_required'; end if;
  select * into v_job from jobs where id = p_job_id for update;
  if not found then raise exception 'not_found'; end if;
  if v_job.status <> 'published' then raise exception 'invalid_state'; end if;
  if exists (select 1 from awards where job_id = p_job_id and cancelled_at is null) then
    raise exception 'has_active_awards';
  end if;
  update bids set status = 'rejected' where job_id = p_job_id and status in ('pending','shortlisted');
  update jobs set status = 'rejected', reject_reason = left(trim(p_reason), 1000),
                  reviewed_by = auth.uid(), reviewed_at = now()
   where id = p_job_id;
  perform notify(v_job.publisher_id, 'job_rejected', jsonb_build_object('job_title', v_job.title, 'reason', left(trim(p_reason), 300)),
                 '/dashboard/my-jobs/' || p_job_id);
  perform log_admin('job.unpublish', 'job', p_job_id::text, jsonb_build_object('reason', p_reason));
end $$;

create or replace function admin_cancel_job(p_job_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare v_job jobs;
begin
  perform require_staff();
  if p_reason is null or char_length(trim(p_reason)) < 3 then raise exception 'reason_required'; end if;
  select * into v_job from jobs where id = p_job_id for update;
  if not found then raise exception 'not_found'; end if;
  if v_job.status in ('completed','cancelled') then raise exception 'invalid_state'; end if;
  update awards set cancelled_at = now(), cancelled_by = auth.uid(), cancel_reason = 'admin: ' || left(trim(p_reason), 480)
   where job_id = p_job_id and cancelled_at is null and completed_at is null;
  update bids set status = 'rejected' where job_id = p_job_id and status in ('pending','shortlisted','accepted');
  update jobs set status = 'cancelled', cancel_reason = left(trim(p_reason), 500) where id = p_job_id;
  perform notify(v_job.publisher_id, 'job_cancelled_admin', jsonb_build_object('job_title', v_job.title, 'reason', left(trim(p_reason), 300)),
                 '/dashboard/my-jobs/' || p_job_id);
  perform log_admin('job.cancel', 'job', p_job_id::text, jsonb_build_object('reason', p_reason));
end $$;

-- Idempotent: the status='pending' guard in the WHERE clause means two admins
-- clicking Verify can only succeed once.
create or replace function admin_verify_payment(p_payment_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := require_admin(); v_pay payments; v_title text;
begin
  update payments set status = 'verified', verified_by = v_uid, verified_at = now()
   where id = p_payment_id and status = 'pending'
  returning * into v_pay;
  if not found then raise exception 'payment_not_pending'; end if;
  update jobs set status = 'pending_review', submitted_at = now()
   where id = v_pay.job_id and status = 'pending_payment'
  returning title into v_title;
  perform notify(v_pay.user_id, 'payment_verified', jsonb_build_object('job_title', v_title, 'amount', v_pay.amount_lkr),
                 '/dashboard/my-jobs/' || v_pay.job_id);
  perform log_admin('payment.verify', 'payment', p_payment_id::text, jsonb_build_object('job_id', v_pay.job_id, 'amount', v_pay.amount_lkr));
end $$;

-- A rejected payment never deletes the job: it stays pending_payment for re-upload.
create or replace function admin_reject_payment(p_payment_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := require_admin(); v_pay payments;
begin
  if p_reason is null or char_length(trim(p_reason)) < 3 then raise exception 'reason_required'; end if;
  update payments set status = 'rejected', verified_by = v_uid, verified_at = now(), reject_reason = left(trim(p_reason), 500)
   where id = p_payment_id and status = 'pending'
  returning * into v_pay;
  if not found then raise exception 'payment_not_pending'; end if;
  perform notify(v_pay.user_id, 'payment_rejected', jsonb_build_object('reason', left(trim(p_reason), 300)),
                 '/dashboard/my-jobs/' || v_pay.job_id);
  perform log_admin('payment.reject', 'payment', p_payment_id::text, jsonb_build_object('reason', p_reason));
end $$;

create or replace function admin_waive_payment(p_job_id uuid, p_note text default null) returns void
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := require_admin(); v_job jobs;
begin
  select * into v_job from jobs where id = p_job_id for update;
  if not found then raise exception 'not_found'; end if;
  if v_job.status <> 'pending_payment' then raise exception 'invalid_state'; end if;
  insert into payments (user_id, job_id, amount_lkr, method, reference, status, verified_by, verified_at, bank_ref)
  values (v_job.publisher_id, p_job_id, 0, 'waived', v_job.payment_ref, 'verified', v_uid, now(), left(p_note, 60));
  update jobs set status = 'pending_review', submitted_at = now() where id = p_job_id;
  perform log_admin('payment.waive', 'job', p_job_id::text, jsonb_build_object('note', p_note));
end $$;

-- There is deliberately no way to grant 'admin' from the application.
create or replace function admin_set_role(p_user_id uuid, p_role app_role, p_grant boolean) returns void
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := require_admin();
begin
  if p_role = 'admin' then raise exception 'forbidden'; end if;
  if p_grant then
    insert into user_roles (user_id, role, granted_by) values (p_user_id, p_role, v_uid) on conflict do nothing;
  else
    delete from user_roles where user_id = p_user_id and role = p_role;
  end if;
  perform log_admin(case when p_grant then 'role.grant' else 'role.revoke' end, 'profile', p_user_id::text,
                    jsonb_build_object('role', p_role));
end $$;

create or replace function admin_verify_broker(p_user_id uuid, p_value boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform require_admin();
  if p_value and not exists (select 1 from user_roles where user_id = p_user_id and role = 'broker') then
    raise exception 'not_a_broker';
  end if;
  update profiles set broker_verified = p_value where id = p_user_id;
  perform log_admin('broker.verify', 'profile', p_user_id::text, jsonb_build_object('value', p_value));
end $$;

create or replace function admin_suspend_user(p_user_id uuid, p_suspend boolean, p_reason text default null) returns void
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := require_staff();
begin
  if p_user_id = v_uid then raise exception 'forbidden'; end if;
  -- Moderators may suspend ordinary users only.
  if not is_admin() and exists (select 1 from user_roles where user_id = p_user_id and role in ('admin','moderator')) then
    raise exception 'forbidden';
  end if;
  if p_suspend and (p_reason is null or char_length(trim(p_reason)) < 3) then raise exception 'reason_required'; end if;
  update profiles set is_suspended = p_suspend, suspended_reason = case when p_suspend then left(trim(p_reason), 500) end
   where id = p_user_id;
  if not found then raise exception 'not_found'; end if;
  perform log_admin(case when p_suspend then 'user.suspend' else 'user.unsuspend' end, 'profile', p_user_id::text,
                    jsonb_build_object('reason', p_reason));
end $$;

create or replace function admin_set_hidden(p_target_type text, p_target_id uuid, p_hidden boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform require_staff();
  if p_target_type = 'thread' then
    update job_threads set is_hidden = p_hidden where id = p_target_id;
  elsif p_target_type = 'review' then
    update reviews set is_hidden = p_hidden where id = p_target_id;
  else
    raise exception 'invalid_input';
  end if;
  if not found then raise exception 'not_found'; end if;
  perform log_admin(case when p_hidden then 'content.hide' else 'content.unhide' end, p_target_type, p_target_id::text, null);
end $$;

create or replace function admin_resolve_report(p_report_id uuid, p_status text) returns void
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := require_staff();
begin
  if p_status not in ('actioned','dismissed','open') then raise exception 'invalid_input'; end if;
  update reports set status = p_status,
                     resolved_by = case when p_status = 'open' then null else v_uid end,
                     resolved_at = case when p_status = 'open' then null else now() end
   where id = p_report_id;
  if not found then raise exception 'not_found'; end if;
  perform log_admin('report.' || p_status, 'report', p_report_id::text, null);
end $$;

create or replace function admin_set_setting(p_key text, p_value jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := require_admin();
begin
  update app_settings set value = p_value, updated_by = v_uid, updated_at = now() where key = p_key;
  if not found then raise exception 'not_found'; end if;
end $$;

create or replace function admin_dashboard_counts()
returns table (jobs_pending_review bigint, payments_pending bigint, reports_open bigint,
               signups_today bigint, awards_this_week bigint, jobs_published bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  perform require_staff();
  return query select
    (select count(*) from jobs where status = 'pending_review' and publisher_id <> auth.uid()),
    (select count(*) from payments where status = 'pending'),
    (select count(*) from reports where status = 'open'),
    (select count(*) from profiles where created_at >= date_trunc('day', now())),
    (select count(*) from awards where awarded_at >= now() - interval '7 days' and cancelled_at is null),
    (select count(*) from jobs where status = 'published');
end $$;

-- Admin-only user search, including email and phone (never exposed elsewhere).
create or replace function admin_search_users(p_query text default null, p_limit int default 50)
returns table (id uuid, full_name text, email text, phone text, phone_verified boolean,
               district_id int, roles app_role[], is_broker boolean, broker_verified boolean,
               is_suspended boolean, suspended_reason text, rating_avg numeric, rating_count int,
               jobs_completed int, jobs_posted bigint, cancelled_awards bigint, created_at timestamptz)
language plpgsql stable security definer set search_path = public, auth as $$
declare v_q text := nullif(trim(p_query), '');
begin
  perform require_admin();
  return query
  select p.id, p.full_name, u.email::text, p.phone, p.phone_verified, p.district_id,
         array(select r.role from user_roles r where r.user_id = p.id order by r.role),
         p.is_broker, p.broker_verified, p.is_suspended, p.suspended_reason,
         p.rating_avg, p.rating_count, p.jobs_completed,
         (select count(*) from jobs j where j.publisher_id = p.id),
         (select count(*) from awards a where a.cancelled_by = p.id),
         p.created_at
  from profiles p join auth.users u on u.id = p.id
  where v_q is null
     or p.full_name ilike '%' || v_q || '%'
     or u.email ilike '%' || v_q || '%'
     or p.phone like '%' || regexp_replace(v_q, '[^0-9+]', '', 'g') || '%'
     or p.id::text = v_q
  order by p.created_at desc
  limit least(p_limit, 200);
end $$;

-- ───────────────────────── Scheduled jobs ─────────────────────────

create or replace function expire_jobs() returns int
language plpgsql security definer set search_path = public as $$
declare v_job record; v_n int := 0;
begin
  for v_job in select id, publisher_id, title from jobs
               where status = 'published' and expires_at < now() for update skip locked loop
    if exists (select 1 from awards where job_id = v_job.id and cancelled_at is null) then
      perform _close_hiring(v_job.id);
    else
      update bids set status = 'rejected', auto_rejected = true where job_id = v_job.id and status in ('pending','shortlisted');
      update jobs set status = 'expired' where id = v_job.id;
      perform notify(v_job.publisher_id, 'job_expired', jsonb_build_object('job_title', v_job.title), '/dashboard/my-jobs/' || v_job.id);
    end if;
    v_n := v_n + 1;
  end loop;
  return v_n;
end $$;

create or replace function warn_expiring_jobs() returns int
language plpgsql security definer set search_path = public as $$
declare v_job record; v_n int := 0;
begin
  for v_job in
    update jobs set expiry_warned_at = now()
     where status = 'published' and expiry_warned_at is null and expires_at < now() + interval '5 days'
    returning id, publisher_id, title, expires_at
  loop
    perform notify(v_job.publisher_id, 'job_expiring',
                   jsonb_build_object('job_title', v_job.title, 'expires_at', v_job.expires_at),
                   '/dashboard/my-jobs/' || v_job.id);
    v_n := v_n + 1;
  end loop;
  return v_n;
end $$;

create or replace function auto_confirm_completions() returns int
language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_n int := 0;
begin
  for v_id in select id from awards
              where completed_at is null and cancelled_at is null
                and completion_requested_at < now() - interval '7 days' loop
    perform _complete_award(v_id);
    v_n := v_n + 1;
  end loop;
  return v_n;
end $$;
