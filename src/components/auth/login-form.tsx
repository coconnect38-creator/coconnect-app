"use client";

import { useLocale, useTranslations } from "next-intl";
import { useActionState } from "react";
import { signIn } from "@/actions/auth";
import { Captcha } from "@/components/forms/captcha";
import { FormError, SubmitButton, useFieldError } from "@/components/forms/form-bits";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";

export function LoginForm({ next }: { next?: string }) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [state, action] = useActionState(signIn, null);
  const err = useFieldError(state);
  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="locale" value={locale} />
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <FormError state={state} />
      <Field label={t("identifier")} htmlFor="identifier" hint={t("identifierHint")} error={err("identifier")}>
        <Input id="identifier" name="identifier" autoComplete="username" required inputMode="email" />
      </Field>
      <Field label={t("password")} htmlFor="password" error={err("password")}>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <div className="text-right">
        <Link href="/reset-password" className="text-sm font-semibold text-primary hover:underline">
          {t("forgot")}
        </Link>
      </div>
      <Captcha resetKey={state} />
      <SubmitButton className="w-full">{t("loginCta")}</SubmitButton>
    </form>
  );
}
