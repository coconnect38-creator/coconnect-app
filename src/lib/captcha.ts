import "server-only";

/** Name of the field hCaptcha adds to a form (see components/forms/captcha.tsx). */
export const CAPTCHA_FIELD = "h-captcha-response";

export function captchaToken(form: FormData): string | undefined {
  const v = form.get(CAPTCHA_FIELD);
  return typeof v === "string" && v ? v : undefined;
}

/**
 * Server-side hCaptcha check for flows Supabase Auth doesn't cover (phone OTP
 * send, job submission). Passes when HCAPTCHA_SECRET is unset so dev/tests run
 * without it. Auth forms (sign-up, login, reset) are NOT checked here: their
 * token goes to Supabase, which verifies it — tokens are single-use, so it
 * must not be verified twice.
 */
export async function verifyCaptcha(token: unknown): Promise<boolean> {
  const secret = process.env.HCAPTCHA_SECRET;
  if (!secret) return true;
  if (typeof token !== "string" || !token) return false;
  try {
    const body = new URLSearchParams({ secret, response: token });
    const siteKey = process.env.NEXT_PUBLIC_HCAPTCHA_SITEKEY;
    if (siteKey) body.set("sitekey", siteKey);
    const res = await fetch("https://api.hcaptcha.com/siteverify", { method: "POST", body, signal: AbortSignal.timeout(8000) });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
