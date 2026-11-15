"use server";

import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { captchaToken } from "@/lib/captcha";
import { normalizeLkPhone } from "@/lib/format";
import { fail, ok, type ActionResult } from "@/lib/result";
import { safeNext, siteUrl } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";
import { loginSchema, newPasswordSchema, registerSchema, resetSchema } from "@/lib/validations/auth";
import { fieldErrors, formToObject } from "@/lib/validations/common";

/** Map Supabase Auth error codes shared by every form; anything else uses `fallback`. */
function authError(code: string | undefined, fallback: string) {
  if (code === "captcha_failed") return "captcha_failed";
  if (code === "over_email_send_rate_limit" || code === "over_request_rate_limit") return "rate_limited";
  return fallback;
}

export async function signUp(_: ActionResult<{ email: string }> | null, form: FormData): Promise<ActionResult<{ email: string }>> {
  const parsed = registerSchema.safeParse(formToObject(form));
  if (!parsed.success) return fail("validation", fieldErrors(parsed.error));
  const { email, password, full_name, locale } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name, preferred_lang: locale },
      captchaToken: captchaToken(form),
      emailRedirectTo: `${siteUrl()}/auth/callback?next=/${locale}/dashboard/settings?welcome=1`,
    },
  });
  if (error) return fail(authError(error.code, error.code === "user_already_exists" ? "email_taken" : "auth_failed"));
  return ok({ email });
}

export async function signIn(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(formToObject(form));
  if (!parsed.success) return fail("validation", fieldErrors(parsed.error));
  const { identifier, password, next, locale } = parsed.data;
  const supabase = await createClient();
  const phone = identifier.includes("@") ? null : normalizeLkPhone(identifier);
  const options = { captchaToken: captchaToken(form) };
  const { error } = phone
    ? await supabase.auth.signInWithPassword({ phone, password, options })
    : await supabase.auth.signInWithPassword({ email: identifier.toLowerCase(), password, options });
  if (error) return fail(authError(error.code, error.code === "email_not_confirmed" ? "email_not_confirmed" : "invalid_credentials"));
  redirect(safeNext(next, `/${locale}/dashboard`));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(`/${await getLocale()}`);
}

export async function requestPasswordReset(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const parsed = resetSchema.safeParse(formToObject(form));
  if (!parsed.success) return fail("validation", fieldErrors(parsed.error));
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${siteUrl()}/auth/callback?next=/${parsed.data.locale}/update-password`,
    captchaToken: captchaToken(form),
  });
  if (error?.code === "captcha_failed") return fail("captcha_failed");
  // Same response whether or not the account exists (no account enumeration).
  return ok(null);
}

export async function updatePassword(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const parsed = newPasswordSchema.safeParse(formToObject(form));
  if (!parsed.success) return fail("validation", fieldErrors(parsed.error));
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return fail(error.code === "same_password" ? "same_password" : "auth_failed");
  redirect(`/${parsed.data.locale}/dashboard`);
}
