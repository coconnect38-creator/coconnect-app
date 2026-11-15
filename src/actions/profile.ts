"use server";

import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/auth";
import { verifyCaptcha } from "@/lib/captcha";
import { toErrorCode } from "@/lib/errors";
import { isImageFile, processImage } from "@/lib/images";
import { fail, ok, type ActionResult } from "@/lib/result";
import { createClient } from "@/lib/supabase/server";
import { fieldErrors, formToObject } from "@/lib/validations/common";
import { phoneSchema, profileSchema, selfRoleSchema } from "@/lib/validations/profile";

export async function updateProfile(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return fail("not_authenticated");
  const parsed = profileSchema.safeParse(formToObject(form));
  if (!parsed.success) return fail("validation", fieldErrors(parsed.error));
  const d = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: d.full_name,
      district_id: d.district_id ?? null,
      city: d.city ?? null,
      bio: d.bio ?? null,
      preferred_lang: d.preferred_lang,
      crew_size: viewer.profile.is_broker ? (d.crew_size ?? null) : null,
    })
    .eq("id", viewer.id);
  if (error) return fail(toErrorCode(error));
  revalidatePath("/", "layout");
  return ok(null);
}

/** Saves the number unverified. Verification happens via Supabase phone OTP. */
export async function savePhone(_: ActionResult<{ phone: string }> | null, form: FormData): Promise<ActionResult<{ phone: string }>> {
  const viewer = await getViewer();
  if (!viewer) return fail("not_authenticated");
  const parsed = phoneSchema.safeParse(formToObject(form));
  if (!parsed.success) return fail("validation", fieldErrors(parsed.error));
  const supabase = await createClient();
  if (parsed.data.phone !== viewer.profile.phone) {
    const { error } = await supabase.from("profiles").update({ phone: parsed.data.phone }).eq("id", viewer.id);
    if (error) return fail(toErrorCode(error));
  }
  revalidatePath("/", "layout");
  return ok({ phone: parsed.data.phone });
}

/**
 * Sends the SMS code for the saved number (Supabase phone_change OTP). Runs on
 * the server so the captcha is checked before an SMS is paid for.
 */
export async function sendPhoneCode(captcha?: string): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return fail("not_authenticated");
  if (!viewer.profile.phone) return fail("phone_required");
  if (!(await verifyCaptcha(captcha))) return fail("captcha_failed");
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ phone: viewer.profile.phone });
  if (error) return fail(error.code === "over_sms_send_rate_limit" || error.code === "over_request_rate_limit" ? "rate_limited" : "sms_unavailable");
  return ok(null);
}

export async function setRole(role: string, enabled: boolean): Promise<ActionResult> {
  const parsed = selfRoleSchema.safeParse(role);
  if (!parsed.success) return fail("invalid_input");
  const supabase = await createClient();
  const { error } = enabled
    ? await supabase.rpc("add_my_role", { p_role: parsed.data })
    : await supabase.rpc("remove_my_role", { p_role: parsed.data });
  if (error) return fail(toErrorCode(error));
  revalidatePath("/", "layout");
  return ok(null);
}

export async function uploadAvatar(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return fail("not_authenticated");
  const file = form.get("avatar");
  if (!isImageFile(file)) return fail("validation", { avatar: ["required"] });
  let webp: Buffer;
  try {
    webp = await processImage(file, 512);
  } catch (e) {
    return fail("validation", { avatar: [(e as Error).message === "imageType" ? "imageType" : "imageSize"] });
  }
  const supabase = await createClient();
  const path = `${viewer.id}/avatar-${Date.now()}.webp`;
  const up = await supabase.storage.from("avatars").upload(path, webp, { contentType: "image/webp", upsert: false });
  if (up.error) return fail("upload_failed");
  const previous = viewer.profile.avatar_url;
  const { error } = await supabase.from("profiles").update({ avatar_url: path }).eq("id", viewer.id);
  if (error) return fail(toErrorCode(error));
  if (previous && previous.startsWith(`${viewer.id}/`)) await supabase.storage.from("avatars").remove([previous]);
  revalidatePath("/", "layout");
  return ok(null);
}
