"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { getViewer } from "@/lib/auth";
import type { Json } from "@/lib/database.types";
import { toErrorCode } from "@/lib/errors";
import { isImageFile, processImage } from "@/lib/images";
import { dispatchNotificationsSoon } from "@/lib/notify";
import { fail, ok, type ActionResult } from "@/lib/result";
import { TAGS } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";
import { fieldErrors, formToObject, optionalInt, optionalText, uuid } from "@/lib/validations/common";

// Second check in every action (the middleware gate is only a convenience;
// the RPCs enforce require_staff()/require_admin() regardless).
async function staff() {
  const v = await getViewer();
  return v?.isStaff ? v : null;
}
async function adminOnly() {
  const v = await getViewer();
  return v?.isAdmin ? v : null;
}

const done = (path = "/[locale]/admin", type: "page" | "layout" = "layout") => {
  // Moderation changes what the public sees (homepage feed and stats).
  updateTag(TAGS.jobs);
  revalidatePath(path, type);
  dispatchNotificationsSoon();
  return ok(null);
};

// ───────────── Moderation & jobs ─────────────

export async function reviewJob(jobId: string, approve: boolean, reason?: string): Promise<ActionResult> {
  if (!(await staff())) return fail("forbidden");
  if (!uuid.safeParse(jobId).success) return fail("invalid_input");
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_review_job", { p_job_id: jobId, p_approve: approve, p_reason: reason?.trim() || undefined });
  if (error) return fail(toErrorCode(error));
  return done();
}

export async function jobAdminAction(
  jobId: string,
  action: "feature" | "unfeature" | "extend" | "unpublish" | "cancel",
  arg?: string,
): Promise<ActionResult> {
  if (!(await staff())) return fail("forbidden");
  if (!uuid.safeParse(jobId).success) return fail("invalid_input");
  const supabase = await createClient();
  const { error } =
    action === "feature" || action === "unfeature"
      ? await supabase.rpc("admin_set_job_featured", { p_job_id: jobId, p_value: action === "feature" })
      : action === "extend"
        ? await supabase.rpc("admin_extend_job", { p_job_id: jobId, p_days: Number(arg) || 7 })
        : action === "unpublish"
          ? await supabase.rpc("admin_unpublish_job", { p_job_id: jobId, p_reason: arg ?? "" })
          : await supabase.rpc("admin_cancel_job", { p_job_id: jobId, p_reason: arg ?? "" });
  if (error) return fail(toErrorCode(error));
  return done();
}

// ───────────── Payments ─────────────

export async function paymentAction(id: string, action: "verify" | "reject" | "waive", reason?: string): Promise<ActionResult> {
  if (!(await adminOnly())) return fail("forbidden");
  if (!uuid.safeParse(id).success) return fail("invalid_input");
  const supabase = await createClient();
  const { error } =
    action === "verify"
      ? await supabase.rpc("admin_verify_payment", { p_payment_id: id })
      : action === "reject"
        ? await supabase.rpc("admin_reject_payment", { p_payment_id: id, p_reason: reason ?? "" })
        : await supabase.rpc("admin_waive_payment", { p_job_id: id, p_note: reason });
  if (error) return fail(toErrorCode(error));
  return done();
}

// ───────────── Users ─────────────

export async function userAction(
  userId: string,
  action: "grant" | "revoke" | "verifyBroker" | "unverifyBroker" | "suspend" | "unsuspend",
  arg?: string,
): Promise<ActionResult> {
  const v = action === "suspend" || action === "unsuspend" ? await staff() : await adminOnly();
  if (!v) return fail("forbidden");
  if (!uuid.safeParse(userId).success) return fail("invalid_input");
  const role = z.enum(["publisher", "worker", "broker", "moderator"]).safeParse(arg);
  const supabase = await createClient();
  const { error } =
    action === "grant" || action === "revoke"
      ? role.success
        ? await supabase.rpc("admin_set_role", { p_user_id: userId, p_role: role.data, p_grant: action === "grant" })
        : { error: { message: "invalid_input" } }
      : action === "verifyBroker" || action === "unverifyBroker"
        ? await supabase.rpc("admin_verify_broker", { p_user_id: userId, p_value: action === "verifyBroker" })
        : await supabase.rpc("admin_suspend_user", { p_user_id: userId, p_suspend: action === "suspend", p_reason: arg });
  if (error) return fail(toErrorCode(error));
  return done();
}

// ───────────── Reports & content ─────────────

export async function setHidden(targetType: "thread" | "review", id: string, hidden: boolean): Promise<ActionResult> {
  if (!(await staff())) return fail("forbidden");
  if (!uuid.safeParse(id).success) return fail("invalid_input");
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_hidden", { p_target_type: targetType, p_target_id: id, p_hidden: hidden });
  if (error) return fail(toErrorCode(error));
  return done();
}

export async function resolveReport(id: string, status: "actioned" | "dismissed" | "open"): Promise<ActionResult> {
  if (!(await staff())) return fail("forbidden");
  if (!uuid.safeParse(id).success) return fail("invalid_input");
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_resolve_report", { p_report_id: id, p_status: status });
  if (error) return fail(toErrorCode(error));
  return done();
}

// ───────────── Categories ─────────────

const categorySchema = z.object({
  id: optionalInt(1, 1_000_000),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]{2,60}$/, "invalid"),
  parent_id: optionalInt(1, 1_000_000),
  name_en: z.string().trim().min(2, "tooShort").max(80, "tooLong"),
  name_si: z.string().trim().min(1, "required").max(80, "tooLong"),
  name_ta: z.string().trim().min(1, "required").max(80, "tooLong"),
  icon: optionalText(40),
  default_rate_unit: z.enum(["per_worker_per_day", "per_day", "per_project"]),
  publish_fee_lkr: z.coerce.number().min(0, "invalid").max(1_000_000, "invalid"),
  sort_order: z.coerce.number().int().min(0).max(10_000),
  is_active: z.preprocess((x) => x === "on" || x === "true", z.boolean()),
});

export async function saveCategory(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  if (!(await adminOnly())) return fail("forbidden");
  const parsed = categorySchema.safeParse(formToObject(form));
  if (!parsed.success) return fail("validation", fieldErrors(parsed.error));
  const { id, ...row } = parsed.data;
  if (id && row.parent_id === id) return fail("invalid_input");
  const supabase = await createClient();
  const payload = { ...row, parent_id: row.parent_id ?? null, icon: row.icon ?? null };
  const { error } = id ? await supabase.from("categories").update(payload).eq("id", id) : await supabase.from("categories").insert(payload);
  if (error) return fail(toErrorCode(error));
  updateTag(TAGS.categories);
  return done();
}

// ───────────── Ads ─────────────

const adSchema = z.object({
  id: uuid.optional().or(z.literal("").transform(() => undefined)),
  title: z.string().trim().min(2, "tooShort").max(120, "tooLong"),
  target_url: z.url("invalid").refine((u) => /^https?:\/\//.test(u), "invalid"),
  slot: z.enum(["home_hero", "listing_inline", "job_sidebar"]),
  district_id: optionalInt(1, 1000),
  category_id: optionalInt(1, 1_000_000),
  starts_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "required"),
  ends_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "required"),
  is_active: z.preprocess((x) => x === "on" || x === "true", z.boolean()),
});

export async function saveAd(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const v = await adminOnly();
  if (!v) return fail("forbidden");
  const parsed = adSchema.safeParse(formToObject(form));
  if (!parsed.success) return fail("validation", fieldErrors(parsed.error));
  const { id, ...row } = parsed.data;
  const supabase = await createClient();
  let image_path: string | undefined;
  const file = form.get("image");
  if (isImageFile(file)) {
    let webp: Buffer;
    try {
      webp = await processImage(file, 1600);
    } catch {
      return fail("validation", { image: ["imageType"] });
    }
    image_path = `${v.id}/ads/${randomUUID()}.webp`;
    const up = await supabase.storage.from("job-images").upload(image_path, webp, { contentType: "image/webp" });
    if (up.error) return fail("upload_failed");
  } else if (!id) {
    return fail("validation", { image: ["required"] });
  }
  const payload = { ...row, district_id: row.district_id ?? null, category_id: row.category_id ?? null, ...(image_path ? { image_path } : {}) };
  const { error } = id
    ? await supabase.from("ad_placements").update(payload).eq("id", id)
    : await supabase.from("ad_placements").insert({ ...payload, image_path: image_path! });
  if (error) return fail(toErrorCode(error));
  return done();
}

export async function deleteAd(id: string): Promise<ActionResult> {
  if (!(await adminOnly())) return fail("forbidden");
  if (!uuid.safeParse(id).success) return fail("invalid_input");
  const supabase = await createClient();
  const { error } = await supabase.from("ad_placements").delete().eq("id", id);
  if (error) return fail(toErrorCode(error));
  return done();
}

// ───────────── Settings ─────────────

const settingsSchema = z.object({
  fees_enabled: z.preprocess((x) => x === "on", z.boolean()),
  require_phone_verification: z.preprocess((x) => x === "on", z.boolean()),
  job_expiry_days: z.coerce.number().int().min(1, "invalid").max(180, "invalid"),
  maintenance_banner: z.string().trim().max(300, "tooLong"),
  bank: z.string().trim().max(80),
  branch: z.string().trim().max(80),
  account: z.string().trim().max(40),
  name: z.string().trim().max(120),
});

export async function saveSettings(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  if (!(await adminOnly())) return fail("forbidden");
  const parsed = settingsSchema.safeParse(formToObject(form));
  if (!parsed.success) return fail("validation", fieldErrors(parsed.error));
  const d = parsed.data;
  const supabase = await createClient();
  const entries: [string, Json][] = [
    ["fees_enabled", d.fees_enabled],
    ["require_phone_verification", d.require_phone_verification],
    ["job_expiry_days", d.job_expiry_days],
    ["maintenance_banner", d.maintenance_banner],
    ["bank_details", { bank: d.bank, branch: d.branch, account: d.account, name: d.name }],
  ];
  for (const [key, value] of entries) {
    const { error } = await supabase.rpc("admin_set_setting", { p_key: key, p_value: value });
    if (error) return fail(toErrorCode(error));
  }
  updateTag(TAGS.settings);
  revalidatePath("/", "layout");
  return ok(null);
}
