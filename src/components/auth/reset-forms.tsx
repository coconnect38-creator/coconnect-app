"use client";

import { useLocale, useTranslations } from "next-intl";
import { useActionState } from "react";
import { requestPasswordReset, updatePassword } from "@/actions/auth";
import { Captcha } from "@/components/forms/captcha";
import { FormError, SubmitButton, useFieldError } from "@/components/forms/form-bits";
import { Alert } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function RequestResetForm() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [state, action] = useActionState(requestPasswordReset, null);
  const err = useFieldError(state);
  if (state?.ok) return <Alert tone="success">{t("resetSent")}</Alert>;
  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="locale" value={locale} />
      <FormError state={state} />
      <Field label={t("email")} htmlFor="email" error={err("email")}>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Captcha resetKey={state} />
      <SubmitButton className="w-full">{t("sendReset")}</SubmitButton>
    </form>
  );
}

export function NewPasswordForm() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [state, action] = useActionState(updatePassword, null);
  const err = useFieldError(state);
  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="locale" value={locale} />
      <FormError state={state} />
      <Field label={t("newPassword")} htmlFor="password" hint={t("passwordHint")} error={err("password")}>
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
      </Field>
      <Field label={t("confirmPassword")} htmlFor="confirm" error={err("confirm")}>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
      </Field>
      <SubmitButton className="w-full">{t("savePassword")}</SubmitButton>
    </form>
  );
}
