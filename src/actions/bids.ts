"use server";

import { revalidatePath } from "next/cache";
import { toErrorCode } from "@/lib/errors";
import { dispatchNotificationsSoon } from "@/lib/notify";
import { fail, ok, type ActionResult } from "@/lib/result";
import { createClient } from "@/lib/supabase/server";
import { bidSchema } from "@/lib/validations/bids";
import { fieldErrors, formToObject, uuid } from "@/lib/validations/common";

export async function placeBid(_: ActionResult<{ id: string }> | null, form: FormData): Promise<ActionResult<{ id: string }>> {
  const parsed = bidSchema.safeParse(formToObject(form));
  if (!parsed.success) return fail("validation", fieldErrors(parsed.error));
  const d = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("place_bid", {
    p_job_id: d.job_id,
    p_rate: d.rate,
    p_rate_unit: d.rate_unit,
    p_workers: d.workers_offered,
    p_days: d.days_offered,
    p_message: d.message,
    p_can_start_on: d.can_start_on,
  });
  if (error) return fail(toErrorCode(error));
  dispatchNotificationsSoon();
  revalidatePath(`/[locale]/jobs/${d.job_id}`, "page");
  return ok({ id: data });
}

export async function withdrawBid(bidId: string): Promise<ActionResult> {
  if (!uuid.safeParse(bidId).success) return fail("invalid_input");
  const supabase = await createClient();
  const { error } = await supabase.rpc("withdraw_bid", { p_bid_id: bidId });
  if (error) return fail(toErrorCode(error));
  revalidatePath("/[locale]/jobs/[id]", "page");
  revalidatePath("/[locale]/dashboard/my-bids", "page");
  return ok(null);
}

export async function setShortlisted(bidId: string, value: boolean): Promise<ActionResult> {
  if (!uuid.safeParse(bidId).success) return fail("invalid_input");
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_bid_shortlisted", { p_bid_id: bidId, p_value: value });
  if (error) return fail(toErrorCode(error));
  dispatchNotificationsSoon();
  revalidatePath("/[locale]/dashboard/my-jobs/[id]", "page");
  return ok(null);
}
