"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { saveAd } from "@/actions/admin";
import { FormError, SubmitButton, useFieldError } from "@/components/forms/form-bits";
import { Alert } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";

type Opt = { id: number; name_en: string };
type Ad = { id: string; title: string; target_url: string; slot: string; district_id: number | null; category_id: number | null; starts_on: string; ends_on: string; is_active: boolean };

export function AdForm({ ad, districts, categories }: { ad?: Ad; districts: Opt[]; categories: Opt[] }) {
  const t = useTranslations("admin.ads");
  const [state, action] = useActionState(saveAd, null);
  const err = useFieldError(state);
  const p = ad ? `a${ad.id.slice(0, 8)}-` : "new-";
  return (
    <form action={action} className="space-y-3">
      {ad ? <input type="hidden" name="id" value={ad.id} /> : null}
      <FormError state={state} />
      {state?.ok ? <Alert tone="success">{t("saved")}</Alert> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("adTitle")} htmlFor={`${p}title`} error={err("title")}><Input id={`${p}title`} name="title" defaultValue={ad?.title} required /></Field>
        <Field label={t("url")} htmlFor={`${p}url`} error={err("target_url")}><Input id={`${p}url`} name="target_url" type="url" defaultValue={ad?.target_url} required /></Field>
        <Field label={t("slot")} htmlFor={`${p}slot`}>
          <Select id={`${p}slot`} name="slot" defaultValue={ad?.slot ?? "listing_inline"}>
            {(["home_hero", "listing_inline", "job_sidebar"] as const).map((s) => <option key={s} value={s}>{t(`slots.${s}`)}</option>)}
          </Select>
        </Field>
        <Field label={t("image")} htmlFor={`${p}image`} hint={ad ? t("imageKeep") : t("imageHint")} error={err("image")}>
          <Input id={`${p}image`} name="image" type="file" accept="image/jpeg,image/png,image/webp" className="py-2" />
        </Field>
        <Field label={t("district")} htmlFor={`${p}district`}>
          <Select id={`${p}district`} name="district_id" defaultValue={ad?.district_id ?? ""}>
            <option value="">{t("nationwide")}</option>
            {districts.map((d) => <option key={d.id} value={d.id}>{d.name_en}</option>)}
          </Select>
        </Field>
        <Field label={t("category")} htmlFor={`${p}category`}>
          <Select id={`${p}category`} name="category_id" defaultValue={ad?.category_id ?? ""}>
            <option value="">{t("anyCategory")}</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name_en}</option>)}
          </Select>
        </Field>
        <Field label={t("starts")} htmlFor={`${p}starts`} error={err("starts_on")}><Input id={`${p}starts`} name="starts_on" type="date" defaultValue={ad?.starts_on} required /></Field>
        <Field label={t("ends")} htmlFor={`${p}ends`} error={err("ends_on")}><Input id={`${p}ends`} name="ends_on" type="date" defaultValue={ad?.ends_on} required /></Field>
      </div>
      <label className="flex min-h-12 items-center gap-2">
        <input type="checkbox" name="is_active" defaultChecked={ad?.is_active ?? true} className="size-5 accent-[var(--primary)]" /> {t("active")}
      </label>
      <SubmitButton size="sm">{ad ? t("save") : t("create")}</SubmitButton>
    </form>
  );
}
