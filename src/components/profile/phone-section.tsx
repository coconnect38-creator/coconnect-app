"use client";

import { BadgeCheck, ShieldAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { savePhone, sendPhoneCode } from "@/actions/profile";
import { Captcha, captchaEnabled } from "@/components/forms/captcha";
import { FormError, SubmitButton, useErrorText, useFieldError } from "@/components/forms/form-bits";
import { Button } from "@/components/ui/button";
import { Alert, Badge } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

/**
 * Step 1: save the number (unverified). Step 2: verify with a Supabase Auth SMS
 * code — on success a DB trigger marks profiles.phone_verified = true.
 */
export function PhoneSection({ phone, verified }: { phone: string | null; verified: boolean }) {
  const t = useTranslations("settings");
  const errorText = useErrorText();
  const router = useRouter();
  const [state, action] = useActionState(savePhone, null);
  const err = useFieldError(state);
  const [stage, setStage] = useState<"idle" | "sent">("idle");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [captcha, setCaptcha] = useState("");
  const [attempt, setAttempt] = useState(0);
  const current = state?.ok ? state.data.phone : phone;
  const isVerified = verified && current === phone;

  const sendCode = () =>
    start(async () => {
      setOtpError(null);
      const res = await sendPhoneCode(captcha || undefined);
      setAttempt((n) => n + 1);
      if (!res.ok) setOtpError(errorText(res.error));
      else setStage("sent");
    });

  const verify = (form: FormData) =>
    start(async () => {
      setOtpError(null);
      const { error } = await createClient().auth.verifyOtp({
        phone: current!,
        token: String(form.get("token") ?? "").trim(),
        type: "phone_change",
      });
      if (error) setOtpError(errorText("otp_failed"));
      else {
        setStage("idle");
        router.refresh();
      }
    });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t("phoneExplainer")}</p>
      <form action={action} className="flex flex-col gap-3 sm:flex-row sm:items-end" noValidate>
        <Field label={t("phone")} htmlFor="phone" error={err("phone")} className="flex-1">
          <Input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="077 123 4567" defaultValue={current ?? ""} />
        </Field>
        <SubmitButton variant="outline">{t("savePhone")}</SubmitButton>
      </form>
      <FormError state={state} />
      {current ? (
        <div className="flex flex-wrap items-center gap-3">
          {isVerified ? (
            <Badge tone="green"><BadgeCheck className="size-4" aria-hidden /> {t("verified")}</Badge>
          ) : (
            <>
              <Badge tone="warning"><ShieldAlert className="size-4" aria-hidden /> {t("unverified")}</Badge>
              {stage === "idle" ? (
                <Button type="button" size="sm" onClick={sendCode} disabled={pending || (captchaEnabled && !captcha)}>
                  {t("sendCode")}
                </Button>
              ) : null}
            </>
          )}
        </div>
      ) : null}
      {current && !isVerified && stage === "idle" ? <Captcha resetKey={attempt} onToken={setCaptcha} /> : null}
      {stage === "sent" ? (
        <form action={verify} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Field label={t("code")} htmlFor="token" hint={t("codeHint")} className="flex-1">
            <Input id="token" name="token" inputMode="numeric" autoComplete="one-time-code" maxLength={8} required />
          </Field>
          <Button type="submit" disabled={pending}>{t("verify")}</Button>
        </form>
      ) : null}
      {otpError ? <Alert tone="warning">{otpError}</Alert> : null}
    </div>
  );
}
