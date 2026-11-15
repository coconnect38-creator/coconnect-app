-- Fix: a per-schema ALTER DEFAULT PRIVILEGES cannot remove PostgreSQL's
-- hard-wired PUBLIC EXECUTE on new functions, so internal functions such as
-- notify() and expire_jobs() were callable by any client. Revoke globally and
-- from every existing function; the explicit grants in 0003 remain in force.
alter default privileges for role postgres revoke execute on functions from public;
revoke execute on all functions in schema public from public;

-- Called from invoker-rights triggers (jobs_before_write, threads_before_write).
grant execute on function detect_contact_info(text) to anon, authenticated;

-- Fix: a non-numeric query reduced the phone pattern to '%%' and matched everyone.
create or replace function admin_search_users(p_query text default null, p_limit int default 50)
returns table (id uuid, full_name text, email text, phone text, phone_verified boolean,
               district_id int, roles app_role[], is_broker boolean, broker_verified boolean,
               is_suspended boolean, suspended_reason text, rating_avg numeric, rating_count int,
               jobs_completed int, jobs_posted bigint, cancelled_awards bigint, created_at timestamptz)
language plpgsql stable security definer set search_path = public, auth as $$
declare
  v_q text := nullif(trim(p_query), '');
  v_digits text := nullif(regexp_replace(coalesce(p_query, ''), '[^0-9]', '', 'g'), '');
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
     or (v_digits is not null and length(v_digits) >= 4
         and regexp_replace(coalesce(p.phone, ''), '[^0-9]', '', 'g') like '%' || ltrim(v_digits, '0') || '%')
     or p.id::text = v_q
  order by p.created_at desc
  limit least(p_limit, 200);
end $$;

grant execute on function admin_search_users(text, int) to authenticated;
