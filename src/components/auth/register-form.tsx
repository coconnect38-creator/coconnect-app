"use client";

import { MailCheck } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useActionState } from "react";
import { signUp } from "@/actions/auth";
import { Captcha } from "@/components/forms/captcha";
import { FormError, SubmitButton, useFieldError } from "@/components/forms/form-bits";
import { Alert } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function RegisterForm() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [state, action] = useActionState(signUp, null);
  const err = useFieldError(state);

  if (state?.ok) {
    return (
      <Alert tone="success" className="flex gap-3">
        <MailCheck className="size-6 shrink-0" aria-hidden />
        <div>
          <p className="font-semibold">{t("checkEmailTitle")}</p>
          <p>{t("checkEmailBody", { email: state.data.email })}</p>
        </div>
      </Alert>
    );
  }

  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="locale" value={locale} />
      <FormError state={state} />
      <Field label={t("fullName")} htmlFor="full_name" error={err("full_name")}>
        <Input id="full_name" name="full_name" autoComplete="name" required minLength={2} maxLength={80} />
      </Field>
      <Field label={t("email")} htmlFor="email" error={err("email")}>
        <Input id="email" name="email" type="email" autoComplete="email" required inputMode="email" />
      </Field>
      <Field label={t("password")} htmlFor="password" hint={t("passwordHint")} error={err("password")}>
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
      </Field>
      <Field label={t("confirmPassword")} htmlFor="confirm" error={err("confirm")}>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
      </Field>
      <p className="text-sm text-muted-foreground">{t("termsNotice")}</p>
      <Captcha resetKey={state} />
      <SubmitButton className="w-full">{t("registerCta")}</SubmitButton>
    </form>
  );
}
