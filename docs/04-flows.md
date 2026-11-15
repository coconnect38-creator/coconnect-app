# Flows

## Job lifecycle
```
draft ──submit_job──▶ pending_payment ──admin_verify_payment──▶ pending_review   (fees on & fee > 0)
draft ──submit_job──────────────────────────────────────────▶ pending_review   (fees off)
pending_review ──admin_review_job(approve)──▶ published ──(expires_at)──▶ expired
pending_review ──admin_review_job(reject)───▶ rejected ──edit + submit_job──▶ …
published ──award_bid × n──▶ (filled or close_hiring) ──▶ in_progress ──all awards complete──▶ completed
in_progress ──cancel_award──▶ published (auto-rejected bids restored)
draft/pending_*/published/rejected ──cancel_job──▶ cancelled
```

## Bids
`pending ⇄ shortlisted` (publisher), `pending/shortlisted → withdrawn` (bidder; can re-bid), `→ accepted` (award), `→ rejected` (close hiring / expiry / cancel). `place_bid` inserts, edits a pending bid, or re-activates a withdrawn one.

## Award
`award_bid(bid)`: lock job row → verify owner + published → insert award → bid accepted → notify → if filled, `_close_hiring`. Contact is available from that moment via `get_job_contact`.

## Completion
`mark_award_complete(award)`: first party → requested (other party notified); other party → completed. pg_cron auto-confirms requests older than 7 days. Completion bumps the worker's `jobs_completed` and prompts both for a review.

## Payments (fees_enabled)
submit → `pending_payment` with a 6-char `payment_ref` → upload slip (`submit_payment_slip`, amount from category fee) → admin verify (idempotent) → `pending_review`. Reject keeps the job in `pending_payment` for re-upload. Admin can waive.
