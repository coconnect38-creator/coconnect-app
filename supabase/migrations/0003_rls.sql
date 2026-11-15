-- Row Level Security + explicit grants. Deny by default (see 0001).
-- Writes that change state go through SECURITY DEFINER RPCs in 0002; the
-- grants below only cover plain CRUD that RLS can fully describe.

alter table districts               enable row level security;
alter table cities                  enable row level security;
alter table categories              enable row level security;
alter table profiles                enable row level security;
alter table user_roles              enable row level security;
alter table jobs                    enable row level security;
alter table job_images              enable row level security;
alter table bids                    enable row level security;
alter table awards                  enable row level security;
alter table reviews                 enable row level security;
alter table job_threads             enable row level security;
alter table payments                enable row level security;
alter table ad_placements           enable row level security;
alter table notifications           enable row level security;
alter table reports                 enable row level security;
alter table admin_actions           enable row level security;
alter table app_settings            enable row level security;
alter table rate_limits             enable row level security;
alter table contact_lookup_failures enable row level security;

-- service_role (server-only) keeps full access; it bypasses RLS anyway.
grant all on all tables    in schema public to service_role;
grant all on all sequences in schema public to service_role;

-- ───────────── Reference data: public read, admin write ─────────────
grant select on districts, cities, categories to anon, authenticated;
grant insert, update, delete on districts, cities, categories to authenticated;
grant usage on sequence districts_id_seq, cities_id_seq, categories_id_seq to authenticated;

create policy "districts read"  on districts for select using (true);
create policy "districts admin" on districts for all to authenticated using (is_admin()) with check (is_admin());
create policy "cities read"     on cities    for select using (true);
create policy "cities admin"    on cities    for all to authenticated using (is_admin()) with check (is_admin());
create policy "categories read" on categories for select using (is_active or is_admin());
create policy "categories admin" on categories for all to authenticated using (is_admin()) with check (is_admin());

-- ───────────── Profiles: own row only (phone lives here) ─────────────
grant select on profiles to authenticated;
grant update (full_name, phone, avatar_url, bio, district_id, city, lat, lng, preferred_lang, crew_size)
  on profiles to authenticated;

create policy "own profile"        on profiles for select to authenticated using (id = (select auth.uid()));
create policy "own profile update" on profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Layer 1: everyone else reads this view, which has no phone column.
-- It is intentionally NOT security_invoker: it must read rows the caller's
-- own-row policy on profiles would hide. It exposes only non-sensitive columns.
create view public_profiles as
select id, full_name, avatar_url, bio, district_id, city,
       is_broker, broker_verified, crew_size, rating_avg, rating_count,
       jobs_completed, created_at
from profiles
where is_suspended = false;

grant select on public_profiles to anon, authenticated;

-- ───────────── Roles ─────────────
grant select on user_roles to authenticated;
create policy "own roles" on user_roles for select to authenticated
  using (user_id = (select auth.uid()) or is_admin());

-- ───────────── Jobs ─────────────
grant select on jobs to anon, authenticated;
grant insert (publisher_id, category_id, title, description, district_id, city, address_hint, lat, lng,
              workers_needed, days_needed, suggested_rate, rate_unit, start_date, is_date_flexible)
  on jobs to authenticated;
grant update (category_id, title, description, district_id, city, address_hint, lat, lng,
              workers_needed, days_needed, suggested_rate, rate_unit, start_date, is_date_flexible)
  on jobs to authenticated;
grant delete on jobs to authenticated;

create policy "jobs public read" on jobs for select using (status = 'published');
create policy "jobs own read"    on jobs for select to authenticated using (publisher_id = (select auth.uid()));
create policy "jobs staff read"  on jobs for select to authenticated using (is_staff());
-- Bidders keep seeing a job they bid on after it closes (to see the outcome).
create policy "jobs bidder read" on jobs for select to authenticated using (is_job_bidder(id));

create policy "jobs insert own" on jobs for insert to authenticated
  with check (publisher_id = (select auth.uid()) and status = 'draft' and is_active_user() and has_role('publisher'));
create policy "jobs update own" on jobs for update to authenticated
  using      (publisher_id = (select auth.uid()) and status in ('draft','pending_payment','pending_review','rejected'))
  with check (publisher_id = (select auth.uid()) and status in ('draft','pending_payment','pending_review','rejected'));
create policy "jobs delete own draft" on jobs for delete to authenticated
  using (publisher_id = (select auth.uid()) and status = 'draft');

-- ───────────── Job images: visible iff the job is visible ─────────────
grant select on job_images to anon, authenticated;
grant insert (job_id, storage_path, sort_order) on job_images to authenticated;
grant update (sort_order) on job_images to authenticated;
grant delete on job_images to authenticated;

create policy "job images read" on job_images for select
  using (exists (select 1 from jobs j where j.id = job_id));
create policy "job images write" on job_images for insert to authenticated
  with check (
    is_job_owner(job_id)
    and split_part(storage_path, '/', 1) = (select auth.uid())::text
    and exists (select 1 from jobs j where j.id = job_id and j.status in ('draft','pending_payment','pending_review','rejected'))
  );
create policy "job images update" on job_images for update to authenticated
  using (is_job_owner(job_id)) with check (is_job_owner(job_id));
create policy "job images delete" on job_images for delete to authenticated
  using (
    is_job_owner(job_id)
    and exists (select 1 from jobs j where j.id = job_id and j.status in ('draft','pending_payment','pending_review','rejected'))
  );

-- ───────────── Bids: bidder sees own; job owner sees all on their job; nobody else ─────────────
-- No write grants: place_bid / withdraw_bid / set_bid_shortlisted / award_bid only.
grant select on bids to authenticated;
create policy "bids read" on bids for select to authenticated
  using (bidder_id = (select auth.uid()) or is_job_owner(job_id) or is_admin());

-- ───────────── Awards: the two parties + admins. Writes via award RPCs only ─────────────
grant select on awards to authenticated;
create policy "awards read" on awards for select to authenticated
  using ((select auth.uid()) in (publisher_id, worker_id) or is_admin());

-- ───────────── Reviews ─────────────
grant select on reviews to anon, authenticated;
grant insert (job_id, reviewer_id, reviewee_id, rating, comment) on reviews to authenticated;

create policy "reviews read" on reviews for select
  using (not is_hidden or reviewer_id = (select auth.uid()) or is_staff());
create policy "reviews insert" on reviews for insert to authenticated
  with check (reviewer_id = (select auth.uid()) and is_active_user() and can_review(job_id, reviewee_id));

-- ───────────── Q&A threads ─────────────
grant select on job_threads to anon, authenticated;
grant insert (job_id, parent_id, author_id, kind, body) on job_threads to authenticated;
grant update (body) on job_threads to authenticated;
grant delete on job_threads to authenticated;

create policy "threads read" on job_threads for select
  using ((not is_hidden or author_id = (select auth.uid()) or is_staff())
         and exists (select 1 from jobs j where j.id = job_id));
create policy "threads insert" on job_threads for insert to authenticated
  with check (
    author_id = (select auth.uid()) and is_active_user()
    and exists (select 1 from jobs j where j.id = job_id
                and (j.status = 'published' or j.publisher_id = (select auth.uid())))
  );
create policy "threads edit own 15m" on job_threads for update to authenticated
  using (author_id = (select auth.uid()) and created_at > now() - interval '15 minutes')
  with check (author_id = (select auth.uid()));
create policy "threads delete own 15m" on job_threads for delete to authenticated
  using (author_id = (select auth.uid()) and created_at > now() - interval '15 minutes');

-- Q&A rate limit: 20 posts per user per day.
create or replace function threads_rate_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform enforce_rate_limit('thread', 20);
  return new;
end $$;
create trigger threads_rate_limit before insert on job_threads
  for each row execute function threads_rate_limit();

-- ───────────── Payments: own rows; admins all. Writes via RPC ─────────────
grant select on payments to authenticated;
create policy "payments read" on payments for select to authenticated
  using (user_id = (select auth.uid()) or is_admin());

-- ───────────── Ads ─────────────
grant select on ad_placements to anon, authenticated;
grant insert, update, delete on ad_placements to authenticated;
create policy "ads public read" on ad_placements for select
  using ((is_active and current_date between starts_on and ends_on) or is_admin());
create policy "ads admin" on ad_placements for all to authenticated using (is_admin()) with check (is_admin());

-- ───────────── Notifications ─────────────
grant select, delete on notifications to authenticated;
grant update (read_at) on notifications to authenticated;
create policy "notifications own" on notifications for select to authenticated using (user_id = (select auth.uid()));
create policy "notifications own update" on notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "notifications own delete" on notifications for delete to authenticated using (user_id = (select auth.uid()));

-- ───────────── Reports ─────────────
grant select on reports to authenticated;
grant insert (reporter_id, target_type, target_id, reason, details) on reports to authenticated;
create policy "reports insert own" on reports for insert to authenticated
  with check (reporter_id = (select auth.uid()) and is_active_user());
create policy "reports read" on reports for select to authenticated
  using (reporter_id = (select auth.uid()) or is_staff());

-- ───────────── Admin-only ─────────────
grant select on admin_actions to authenticated;
create policy "audit admin read" on admin_actions for select to authenticated using (is_admin());

grant select on app_settings to anon, authenticated;
create policy "settings read" on app_settings for select using (is_public or is_admin());

grant select on contact_lookup_failures to authenticated;
create policy "contact failures admin" on contact_lookup_failures for select to authenticated using (is_admin());

-- rate_limits: RLS on, no policies, no grants. Only SECURITY DEFINER code touches it.

-- ───────────── Function grants ─────────────
-- Helpers used inside RLS policies must be executable by the querying role.
grant execute on function has_role(app_role), is_admin(), is_staff(), is_job_owner(uuid), is_job_bidder(uuid),
                          is_active_user(), can_review(uuid, uuid)
  to anon, authenticated;

-- Public aggregates and counters.
grant execute on function get_home_stats(int), get_district_stats(), get_category_counts(), get_rate_stats(int, int),
                          record_job_view(uuid), record_ad_impressions(uuid[]), record_ad_click(uuid)
  to anon, authenticated;

-- Signed-in user RPCs.
grant execute on function
  add_my_role(app_role), remove_my_role(app_role), mark_notifications_read(uuid[]),
  submit_job(uuid), cancel_job(uuid, text),
  place_bid(uuid, numeric, rate_unit, int, int, text, date), withdraw_bid(uuid), set_bid_shortlisted(uuid, boolean),
  award_bid(uuid), close_hiring(uuid), cancel_award(uuid, text), mark_award_complete(uuid),
  get_job_contact(uuid), submit_payment_slip(uuid, text, text)
  to authenticated;

-- Staff/admin RPCs: granted to authenticated, each checks require_staff()/require_admin() itself.
grant execute on function
  admin_review_job(uuid, boolean, text), admin_set_job_featured(uuid, boolean), admin_extend_job(uuid, int),
  admin_unpublish_job(uuid, text), admin_cancel_job(uuid, text),
  admin_verify_payment(uuid), admin_reject_payment(uuid, text), admin_waive_payment(uuid, text),
  admin_set_role(uuid, app_role, boolean), admin_verify_broker(uuid, boolean), admin_suspend_user(uuid, boolean, text),
  admin_set_hidden(text, uuid, boolean), admin_resolve_report(uuid, text), admin_set_setting(text, jsonb),
  admin_dashboard_counts(), admin_search_users(text, int)
  to authenticated;

-- Internal functions (notify, log_admin, _close_hiring, expire_jobs, ...) are not granted:
-- the 0001 default-privilege revoke means only postgres/service_role can call them.
grant execute on all functions in schema public to service_role;

-- ───────────── Realtime: live bid counts on job pages ─────────────
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table jobs;
  end if;
end $$;
