"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { getViewer } from "@/lib/auth";
import { captchaToken, verifyCaptcha } from "@/lib/captcha";
import { toErrorCode } from "@/lib/errors";
import { isImageFile, processImage } from "@/lib/images";
import { fail, ok, type ActionResult } from "@/lib/result";
import { TAGS } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";
import { fieldErrors, formToObject, uuid } from "@/lib/validations/common";
import { jobSchema } from "@/lib/validations/jobs";

const MAX_IMAGES = 5;

/** Create or update a draft (and optionally submit it to moderation) in one go. */
export async function saveJob(_: ActionResult<{ id: string }> | null, form: FormData): Promise<ActionResult<{ id: string }>> {
  const viewer = await getViewer();
  if (!viewer) return fail("not_authenticated");
  const parsed = jobSchema.safeParse(formToObject(form));
  if (!parsed.success) return fail("validation", fieldErrors(parsed.error));
  const { job_id, intent, ...d } = parsed.data;
  if (intent === "submit" && !(await verifyCaptcha(captchaToken(form)))) return fail("captcha_failed");
  const supabase = await createClient();

  const fields = {
    category_id: d.category_id,
    district_id: d.district_id,
    city: d.city ?? null,
    address_hint: d.address_hint ?? null,
    title: d.title,
    description: d.description,
    workers_needed: d.workers_needed ?? null,
    days_needed: d.days_needed ?? null,
    suggested_rate: d.suggested_rate,
    rate_unit: d.rate_unit,
    start_date: d.start_date ?? null,
    is_date_flexible: d.is_date_flexible,
    lat: d.lat ?? null,
    lng: d.lng ?? null,
  };

  let id = job_id;
  if (id) {
    // RLS: only the owner, only while draft/pending_*/rejected.
    const { data, error } = await supabase.from("jobs").update(fields).eq("id", id).select("id");
    if (error) return fail(toErrorCode(error));
    if (!data?.length) return fail("invalid_state");
  } else {
    const { data, error } = await supabase.from("jobs").insert({ ...fields, publisher_id: viewer.id }).select("id").single();
    if (error) return fail(error.message.includes("row-level security") ? "role_required" : toErrorCode(error));
    id = data.id;
  }

  // Remove photos the user unticked.
  const remove = form.getAll("remove_image").map(String).filter((x) => uuid.safeParse(x).success);
  if (remove.length) {
    const { data: gone } = await supabase.from("job_images").delete().eq("job_id", id).in("id", remove).select("storage_path");
    if (gone?.length) await supabase.storage.from("job-images").remove(gone.map((g) => g.storage_path));
  }

  // Upload new photos (EXIF stripped server-side).
  const files = form.getAll("photos").filter(isImageFile);
  if (files.length) {
    const { count } = await supabase.from("job_images").select("id", { count: "exact", head: true }).eq("job_id", id);
    const room = Math.max(0, MAX_IMAGES - (count ?? 0));
    for (const [i, file] of files.slice(0, room).entries()) {
      let webp: Buffer;
      try {
        webp = await processImage(file);
      } catch {
        continue;
      }
      const path = `${viewer.id}/${id}/${randomUUID()}.webp`;
      const up = await supabase.storage.from("job-images").upload(path, webp, { contentType: "image/webp" });
      if (up.error) return fail("upload_failed");
      const { error } = await supabase.from("job_images").insert({ job_id: id, storage_path: path, sort_order: (count ?? 0) + i });
      if (error) {
        await supabase.storage.from("job-images").remove([path]);
        return fail(toErrorCode(error));
      }
    }
  }

  if (intent === "submit") {
    const { error } = await supabase.rpc("submit_job", { p_job_id: id! });
    if (error) {
      revalidatePath("/[locale]/dashboard/my-jobs", "page");
      return fail(toErrorCode(error));
    }
  }
  revalidatePath("/[locale]/dashboard/my-jobs", "page");
  redirect(`/${await getLocale()}/dashboard/my-jobs/${id}${intent === "submit" ? "?submitted=1" : "?saved=1"}`);
}

export async function submitJob(jobId: string, captcha?: string): Promise<ActionResult> {
  if (!uuid.safeParse(jobId).success) return fail("invalid_input");
  if (!(await verifyCaptcha(captcha))) return fail("captcha_failed");
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_job", { p_job_id: jobId });
  if (error) return fail(toErrorCode(error));
  revalidatePath("/[locale]/dashboard/my-jobs/[id]", "page");
  return ok(null);
}

export async function cancelJob(jobId: string, reason: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_job", { p_job_id: jobId, p_reason: reason.slice(0, 500) });
  if (error) return fail(toErrorCode(error));
  revalidatePath("/[locale]/dashboard/my-jobs/[id]", "page");
  revalidateTag(TAGS.jobs, "max");
  return ok(null);
}

export async function deleteDraft(jobId: string): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return fail("not_authenticated");
  const supabase = await createClient();
  const { data: imgs } = await supabase.from("job_images").select("storage_path").eq("job_id", jobId);
  const { data, error } = await supabase.from("jobs").delete().eq("id", jobId).eq("status", "draft").select("id");
  if (error) return fail(toErrorCode(error));
  if (!data?.length) return fail("invalid_state");
  if (imgs?.length) await supabase.storage.from("job-images").remove(imgs.map((i) => i.storage_path));
  redirect(`/${await getLocale()}/dashboard/my-jobs`);
}

export async function recordJobView(jobId: string) {
  const supabase = await createClient();
  await supabase.rpc("record_job_view", { p_job_id: jobId });
}
