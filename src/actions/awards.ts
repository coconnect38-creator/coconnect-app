"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { toErrorCode } from "@/lib/errors";
import { dispatchNotificationsSoon } from "@/lib/notify";
import { fail, ok, type ActionResult } from "@/lib/result";
import { TAGS } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";
import { reasonSchema } from "@/lib/validations/bids";
import { uuid } from "@/lib/validations/common";

function refresh() {
  revalidatePath("/[locale]/dashboard/my-jobs/[id]", "page");
  revalidatePath("/[locale]/jobs/[id]", "page");
  revalidatePath("/[locale]/dashboard/my-bids", "page");
  // Awarding/closing takes a job off the public feed; others may see it a moment longer.
  revalidateTag(TAGS.jobs, "max");
}

export async function awardBid(bidId: string): Promise<ActionResult> {
  if (!uuid.safeParse(bidId).success) return fail("invalid_input");
  const supabase = await createClient();
  const { error } = await supabase.rpc("award_bid", { p_bid_id: bidId });
  if (error) return fail(toErrorCode(error));
  dispatchNotificationsSoon();
  refresh();
  return ok(null);
}

export async function closeHiring(jobId: string): Promise<ActionResult> {
  if (!uuid.safeParse(jobId).success) return fail("invalid_input");
  const supabase = await createClient();
  const { error } = await supabase.rpc("close_hiring", { p_job_id: jobId });
  if (error) return fail(toErrorCode(error));
  dispatchNotificationsSoon();
  refresh();
  return ok(null);
}

export async function cancelAward(awardId: string, reason: string): Promise<ActionResult> {
  const r = reasonSchema.safeParse(reason);
  if (!uuid.safeParse(awardId).success || !r.success) return fail("reason_required");
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_award", { p_award_id: awardId, p_reason: r.data });
  if (error) return fail(toErrorCode(error));
  dispatchNotificationsSoon();
  refresh();
  return ok(null);
}

export async function markComplete(awardId: string): Promise<ActionResult<{ state: string }>> {
  if (!uuid.safeParse(awardId).success) return fail("invalid_input");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("mark_award_complete", { p_award_id: awardId });
  if (error) return fail(toErrorCode(error));
  dispatchNotificationsSoon();
  refresh();
  return ok({ state: data });
}
