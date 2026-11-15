# Stage 1 scope

Source of truth: section "Stage 1 MVP scope" of the plan. Summary of what ships:

- **Accounts** — email+password signup with email confirmation, login by email or verified phone, password reset, profile completion (name, district, city, phone), role self-service (worker/broker).
- **Posting** — multi-step form (category → location → details → rate → photos → review), drafts, submit to moderation, edit & resubmit when rejected, cancel, auto-expire (30 days, warning at day 25).
- **Discovery** — listing with district/category/rate/start-date filters, text search (trigram), sort newest/closing soon/highest rate, "near me" by profile district, detail page with images, publisher rating, bid count and lowest rate, Q&A.
- **Bidding** — rate, unit, workers, days, message, earliest start; one bid per job; edit while pending; withdraw; publisher bid table with ratings; shortlist.
- **Awards (multi)** — award one or more bids; contact reveal per award; close hiring; cancel award with reason.
- **Completion & reputation** — mark complete / confirm / auto-confirm after 7 days; two-way 1–5 star reviews; public profile with review list.
- **Q&A, reports** — threaded questions/answers, report anything, moderator queue.
- **Admin** — dashboard, moderation queue with auto-flags, jobs, users & roles, categories & fees, payments (bank slips), reports, ads, settings, audit log.
- **Payments** — bank details, slip upload, verification queue — behind `fees_enabled = false`.
- **Notifications** — in-app bell + email outbox.
- **Languages** — English, Sinhala and Tamil complete (Sinhala and Tamil need native-speaker proofreading).

Out of scope for stage 1: in-app chat, saved searches, SMS job alerts, portfolios, invoicing, subscriptions, public API, native apps, recommendations.
