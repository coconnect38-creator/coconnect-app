"use server";

import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/auth";
import { toErrorCode } from "@/lib/errors";
import { dispatchNotificationsSoon } from "@/lib/notify";
import { fail, ok, type ActionResult } from "@/lib/result";
import { createClient } from "@/lib/supabase/server";
import { reportSchema, reviewSchema, threadSchema } from "@/lib/validations/bids";
import { fieldErrors, formToObject, uuid } from "@/lib/validations/common";

export async function submitReview(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return fail("not_authenticated");
  const parsed = reviewSchema.safeParse(formToObject(form));
  if (!parsed.success) return fail("validation", fieldErrors(parsed.error));
  const supabase = await createClient();
  // RLS: only with a completed, non-cancelled award between the two on this job.
  const { error } = await supabase.from("reviews").insert({ ...parsed.data, reviewer_id: viewer.id, comment: parsed.data.comment ?? null });
  if (error) return fail(toErrorCode(error));
  dispatchNotificationsSoon();
  revalidatePath("/[locale]/jobs/[id]", "page");
  revalidatePath("/[locale]/dashboard/my-jobs/[id]", "page");
  return ok(null);
}

export async function postThread(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return fail("not_authenticated");
  const parsed = threadSchema.safeParse(formToObject(form));
  if (!parsed.success) return fail("validation", fieldErrors(parsed.error));
  const supabase = await createClient();
  const { error } = await supabase
    .from("job_threads")
    .insert({ ...parsed.data, parent_id: parsed.data.parent_id ?? null, author_id: viewer.id });
  if (error) return fail(toErrorCode(error));
  revalidatePath(`/[locale]/jobs/${parsed.data.job_id}`, "page");
  return ok(null);
}

export async function deleteThread(id: string): Promise<ActionResult> {
  if (!uuid.safeParse(id).success) return fail("invalid_input");
  const supabase = await createClient();
  const { data, error } = await supabase.from("job_threads").delete().eq("id", id).select("id");
  if (error) return fail(toErrorCode(error));
  if (!data?.length) return fail("invalid_state");
  revalidatePath("/[locale]/jobs/[id]", "page");
  return ok(null);
}

export async function submitReport(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return fail("not_authenticated");
  const parsed = reportSchema.safeParse(formToObject(form));
  if (!parsed.success) return fail("validation", fieldErrors(parsed.error));
  const supabase = await createClient();
  const { error } = await supabase.from("reports").insert({ ...parsed.data, details: parsed.data.details ?? null, reporter_id: viewer.id });
  if (error) return fail(toErrorCode(error));
  return ok(null);
}

export async function markNotificationsRead(ids?: string[]): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_notifications_read", { p_ids: ids?.filter((x) => uuid.safeParse(x).success) });
  if (error) return fail(toErrorCode(error));
  revalidatePath("/", "layout");
  return ok(null);
}
