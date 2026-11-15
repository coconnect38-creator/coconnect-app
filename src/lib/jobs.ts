import type { Database } from "@/lib/database.types";

export type JobStatus = Database["public"]["Enums"]["job_status"];
export type BidStatus = Database["public"]["Enums"]["bid_status"];
export type JobRow = Database["public"]["Tables"]["jobs"]["Row"];
export type BidRow = Database["public"]["Tables"]["bids"]["Row"];
export type AwardRow = Database["public"]["Tables"]["awards"]["Row"];
export type PublicProfile = Database["public"]["Views"]["public_profiles"]["Row"];

export const EDITABLE_STATUSES: JobStatus[] = ["draft", "pending_payment", "pending_review", "rejected"];
export const CANCELLABLE_STATUSES: JobStatus[] = ["draft", "pending_payment", "pending_review", "published", "rejected"];

export const statusTone: Record<JobStatus, "neutral" | "green" | "clay" | "warning" | "danger"> = {
  draft: "neutral",
  pending_payment: "warning",
  pending_review: "warning",
  published: "green",
  rejected: "danger",
  awarded: "clay",
  in_progress: "clay",
  completed: "green",
  cancelled: "neutral",
  expired: "neutral",
};

export const bidTone: Record<BidStatus, "neutral" | "green" | "clay" | "warning" | "danger"> = {
  pending: "neutral",
  shortlisted: "clay",
  accepted: "green",
  rejected: "danger",
  withdrawn: "neutral",
};

export function isActiveAward(a: Pick<AwardRow, "cancelled_at">) {
  return !a.cancelled_at;
}
