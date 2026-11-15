-- Scheduled maintenance via pg_cron (runs inside the database, no Vercel cron needed).
create extension if not exists pg_cron;

select cron.schedule('coconnect-expire-jobs',      '*/15 * * * *', $$select public.expire_jobs()$$);
select cron.schedule('coconnect-warn-expiring',    '0 * * * *',    $$select public.warn_expiring_jobs()$$);
select cron.schedule('coconnect-auto-confirm',     '30 * * * *',   $$select public.auto_confirm_completions()$$);
select cron.schedule('coconnect-prune-ratelimits', '0 3 * * *',    $$delete from public.rate_limits where created_at < now() - interval '3 days'$$);
