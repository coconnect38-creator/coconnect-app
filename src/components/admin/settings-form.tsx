"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { saveSettings } from "@/actions/admin";
import { FormError, SubmitButton, useFieldError } from "@/components/forms/form-bits";
import { Alert, Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { PublicSettings } from "@/lib/data/reference";

export function SettingsForm({ settings }: { settings: PublicSettings }) {
  const t = useTranslations("admin.settings");
  const [state, action] = useActionState(saveSettings, null);
  const err = useFieldError(state);
  const check = "flex min-h-12 items-start gap-3";
  return (
    <form action={action} className="space-y-4">
      <FormError state={state} />
      {state?.ok ? <Alert tone="success">{t("saved")}</Alert> : null}
      <Card className="space-y-3">
        <h2 className="font-bold">{t("fees")}</h2>
        <label className={check}>
          <input type="checkbox" name="fees_enabled" defaultChecked={settings.fees_enabled} className="mt-1 size-5 accent-[var(--primary)]" />
          <span><span className="font-semibold">{t("feesEnabled")}</span><br /><span className="text-sm text-muted-foreground">{t("feesHint")}</span></span>
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("bank")} htmlFor="bank"><Input id="bank" name="bank" defaultValue={settings.bank_details.bank} /></Field>
          <Field label={t("branch")} htmlFor="branch"><Input id="branch" name="branch" defaultValue={settings.bank_details.branch} /></Field>
          <Field label={t("accountName")} htmlFor="name"><Input id="name" name="name" defaultValue={settings.bank_details.name} /></Field>
          <Field label={t("accountNo")} htmlFor="account"><Input id="account" name="account" defaultValue={settings.bank_details.account} /></Field>
        </div>
      </Card>
      <Card className="space-y-3">
        <h2 className="font-bold">{t("general")}</h2>
        <Field label={t("expiryDays")} htmlFor="job_expiry_days" error={err("job_expiry_days")}>
          <Input id="job_expiry_days" name="job_expiry_days" type="number" min={1} max={180} defaultValue={settings.job_expiry_days} />
        </Field>
        <label className={check}>
          <input type="checkbox" name="require_phone_verification" defaultChecked={settings.require_phone_verification} className="mt-1 size-5 accent-[var(--primary)]" />
          <span><span className="font-semibold">{t("requireVerify")}</span><br /><span className="text-sm text-muted-foreground">{t("requireVerifyHint")}</span></span>
        </label>
        <Field label={t("banner")} htmlFor="maintenance_banner" hint={t("bannerHint")} error={err("maintenance_banner")}>
          <Input id="maintenance_banner" name="maintenance_banner" maxLength={300} defaultValue={settings.maintenance_banner} />
        </Field>
      </Card>
      <SubmitButton>{t("save")}</SubmitButton>
    </form>
  );
}
