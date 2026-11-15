/**
 * Database functions raise short codes (`raise exception 'self_bid'`). This maps
 * any Supabase/Postgres error to a key under `errors.*` in the locale files.
 */
export const KNOWN_ERRORS = [
  "not_authenticated", "account_suspended", "phone_required", "phone_unverified", "rate_limited",
  "not_found", "invalid_state", "role_required", "role_not_self_service", "broker_requires_worker", "last_role",
  "category_inactive", "self_bid", "job_not_open", "broker_required", "bid_locked", "bid_not_awardable",
  "bidder_suspended", "no_active_awards", "has_active_awards", "reason_required", "invalid_slip",
  "payment_already_pending", "payment_not_pending", "own_job", "forbidden", "invalid_input", "not_a_broker",
  "too_many_images", "thread_parent_mismatch", "duplicate", "validation", "upload_failed", "unknown",
] as const;
export type ErrorCode = (typeof KNOWN_ERRORS)[number];

export function toErrorCode(error: { message?: string; code?: string } | null | undefined): ErrorCode {
  if (!error) return "unknown";
  const msg = error.message ?? "";
  if ((KNOWN_ERRORS as readonly string[]).includes(msg)) return msg as ErrorCode;
  if (error.code === "23505" || /duplicate key/.test(msg)) return "duplicate";
  if (error.code === "42501" || /row-level security|permission denied/.test(msg)) return "forbidden";
  if (error.code === "23514" || error.code === "22P02") return "invalid_input";
  return "unknown";
}
