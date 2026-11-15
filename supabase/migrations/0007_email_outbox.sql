-- Email outbox: atomically claim un-emailed notifications (FOR UPDATE SKIP LOCKED
-- means two concurrent dispatchers never send the same email). Server-only.
create or replace function claim_email_batch(p_types text[], p_limit int default 50)
returns table (id uuid, user_id uuid, type text, data jsonb, link text, email text, preferred_lang text, full_name text)
language sql security definer set search_path = public, auth as $$
  with claimed as (
    update notifications n set emailed_at = now()
     where n.id in (
       select x.id from notifications x
        where x.emailed_at is null and x.type = any(p_types) and x.created_at > now() - interval '2 days'
        order by x.created_at
        limit least(p_limit, 200)
        for update skip locked)
    returning n.*
  )
  select c.id, c.user_id, c.type, c.data, c.link, u.email::text, p.preferred_lang, p.full_name
  from claimed c
  join profiles p on p.id = c.user_id
  join auth.users u on u.id = c.user_id;
$$;

revoke all on function claim_email_batch(text[], int) from public, anon, authenticated;
grant execute on function claim_email_batch(text[], int) to service_role;
