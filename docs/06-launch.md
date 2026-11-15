# Launch runbook (M14)

Everything in the code is done; this is the part that needs accounts and people.
Do the steps in order. Tick them off in the PR or a copy of this file.

## 1. Rotate the shared credentials

The database password and the `sb_secret_…` key were pasted into a chat during the build.

- Supabase → Project Settings → Database → **Reset database password**. Update `DATABASE_URL` in `.env.local`.
- Supabase → Project Settings → API Keys → create a new **secret** key, delete the old one. Update `SUPABASE_SERVICE_ROLE_KEY`.

## 2. Supabase Auth settings (dashboard)

| Where | Setting |
| --- | --- |
| Auth → URL Configuration | **Site URL** = `https://<your-domain>` |
| Auth → URL Configuration | **Redirect URLs**: `http://localhost:3000/auth/callback`, `https://<your-domain>/auth/callback`, and `https://*-<vercel-team>.vercel.app/auth/callback` for preview deploys |
| Auth → Providers → Email | Keep **Confirm email** on |
| Auth → SMTP | Custom SMTP (Resend: `smtp.resend.com`, port 465, user `resend`, password = Resend API key). The built-in sender is limited to a few emails an hour. |
| Auth → Providers → Phone | Enable, pick an SMS provider (Twilio / MessageBird / Vonage / Textlocal). Price a local gateway before promoting the site: SMS is the cost that grows with sign-ups. |
| Auth → Rate Limits | SMS: keep low (e.g. 30/hour project-wide); OTP verify: default |
| Auth → Bot and Abuse Protection | Enable **hCaptcha**, paste the hCaptcha **secret** |

After SMS works, test it on your own number in Settings → Mobile number, then turn on
**Admin → Settings → Require verified phone**.

## 3. Third-party accounts

| Service | What to create | Env vars |
| --- | --- | --- |
| hCaptcha | Site for `<your-domain>` (and `localhost`) | `NEXT_PUBLIC_HCAPTCHA_SITEKEY`, `HCAPTCHA_SECRET` (same secret as in Supabase) |
| Resend | Verify the sending domain (SPF + DKIM records) | `RESEND_API_KEY`, `EMAIL_FROM="CoConnect <noreply@<your-domain>>"` |
| Sentry | Project of type *Browser JavaScript* (one project is enough) | `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN` (same DSN) |

Sentry → Project Settings → **Loader Script**: SDK version latest, *Enable Performance Monitoring* off,
*Enable Session Replay* off. That keeps the browser side at ~1 KB until an error happens.

Captcha and Sentry are off when their variables are empty, so dev and tests need nothing.

## 4. Vercel

1. Import `github.com/Pasindu599/coconnect-next-level`, framework Next.js, Node 22.
2. Environment variables (Production and Preview), from `.env.example`:
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
   `NEXT_PUBLIC_SITE_URL=https://<your-domain>`, `RESEND_API_KEY`, `EMAIL_FROM`, `CRON_SECRET` (random 32+ chars),
   `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_HCAPTCHA_SITEKEY`, `HCAPTCHA_SECRET`.
   **Do not** add `DATABASE_URL` to Vercel: only the local scripts use it.
3. **Region**: Settings → Functions → pick the region closest to the Supabase project (TTFB depends on it).
4. **Cron**: `vercel.json` runs `/api/cron/dispatch` once a day at 02:30 UTC (08:00 in Sri Lanka), the most the
   Hobby plan allows (Hobby may fire it any time within that hour). It only *sends emails* for notifications that
   pg_cron created (expiry warnings, auto-confirm); the pg_cron jobs themselves still run every 15–60 min in Supabase,
   and any user action on the site also flushes pending emails. On Pro, change it back to hourly (`0 * * * *`).
5. Domain: add it in Vercel, set DNS, then update the Supabase Site URL / redirect URLs (step 2).

## 5. First production checks

```bash
npm run db:make-admin -- coconnect38@gmail.com     # after signing up on the live site
```

- Sign up → confirm email → log in. Reset password once.
- Post a job as one account, approve it as admin, bid from a second account, award, and check that both phone
  numbers appear only after the award (the same assertions as `npm run test:e2e`).
- In a preview deploy, add a temporary `throw` to a server component and to a client click handler, and confirm
  both errors reach Sentry. Remove them before promoting to production.
- Lighthouse (mobile) on the live domain:
  `npx lighthouse https://<domain>/en --only-categories=performance,accessibility,best-practices,seo --view`.
  Local results are in `docs/00-decisions.md` #28.

## 6. Pre-launch checklist (from the plan)

| Item | State |
| --- | --- |
| Every table has RLS enabled and at least one policy | ✅ `npm run db:test` |
| Service role key nowhere in client-reachable code | ✅ only `src/lib/supabase/admin.ts` |
| `get_job_contact` returns nothing without an award, tested from a second account | ✅ db:test + e2e |
| hCaptcha live on signup, OTP and posting; OTP rate limits configured | 🟡 code done, needs keys + Supabase toggle (steps 2–3) |
| Database backups on, and a restore actually tested once | ⬜ Supabase Pro has daily backups; restore one into a scratch project once |
| Sentry capturing server and client errors | 🟡 code done, needs DSN (step 3) |
| Privacy policy, terms of service, a stated data-deletion route | 🟡 drafts in place (`/terms`, `/privacy`, Settings → Account); **lawyer review required** (PDPA No. 9 of 2022) |
| Sinhala and Tamil proofread by native speakers, on a real low-end phone | ⬜ both are complete but machine-written |
| Seeded with 20–30 genuine jobs before telling anyone | ⬜ pick one district first (plan, open question 6) |
| A named person on the moderation queue with a response-time commitment | ⬜ `npm run db:make-admin` or Admin → Users → +moderator |
