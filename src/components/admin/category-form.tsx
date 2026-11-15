"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { saveCategory } from "@/actions/admin";
import { FormError, SubmitButton, useFieldError } from "@/components/forms/form-bits";
import { Alert } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";

type Cat = {
  id: number; slug: string; parent_id: number | null; name_en: string; name_si: string; name_ta: string; icon: string | null;
  default_rate_unit: string; publish_fee_lkr: number; sort_order: number; is_active: boolean;
};

export function CategoryForm({ category, parents }: { category?: Cat; parents: { id: number; name_en: string }[] }) {
  const t = useTranslations("admin.categories");
  const tu = useTranslations("rateUnit");
  const [state, action] = useActionState(saveCategory, null);
  const err = useFieldError(state);
  const p = category?.id ? `c${category.id}-` : "new-";
  return (
    <form action={action} className="space-y-3">
      {category ? <input type="hidden" name="id" value={category.id} /> : null}
      <FormError state={state} />
      {state?.ok ? <Alert tone="success">{t("saved")}</Alert> : null}
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label={t("nameEn")} htmlFor={`${p}en`} error={err("name_en")}><Input id={`${p}en`} name="name_en" defaultValue={category?.name_en} required /></Field>
        <Field label={t("nameSi")} htmlFor={`${p}si`} error={err("name_si")}><Input id={`${p}si`} name="name_si" defaultValue={category?.name_si} required /></Field>
        <Field label={t("nameTa")} htmlFor={`${p}ta`} error={err("name_ta")}><Input id={`${p}ta`} name="name_ta" defaultValue={category?.name_ta} required /></Field>
        <Field label={t("slug")} htmlFor={`${p}slug`} error={err("slug")}><Input id={`${p}slug`} name="slug" defaultValue={category?.slug} required pattern="[a-z0-9-]+" /></Field>
        <Field label={t("parent")} htmlFor={`${p}parent`}>
          <Select id={`${p}parent`} name="parent_id" defaultValue={category?.parent_id ?? ""}>
            <option value="">{t("noParent")}</option>
            {parents.filter((x) => x.id !== category?.id).map((x) => <option key={x.id} value={x.id}>{x.name_en}</option>)}
          </Select>
        </Field>
        <Field label={t("icon")} htmlFor={`${p}icon`} hint={t("iconHint")}><Input id={`${p}icon`} name="icon" defaultValue={category?.icon ?? ""} /></Field>
        <Field label={t("unit")} htmlFor={`${p}unit`}>
          <Select id={`${p}unit`} name="default_rate_unit" defaultValue={category?.default_rate_unit ?? "per_worker_per_day"}>
            {(["per_worker_per_day", "per_day", "per_project"] as const).map((u) => <option key={u} value={u}>{tu(u)}</option>)}
          </Select>
        </Field>
        <Field label={t("fee")} htmlFor={`${p}fee`} hint={t("feeHint")} error={err("publish_fee_lkr")}><Input id={`${p}fee`} name="publish_fee_lkr" type="number" step="0.01" min={0} defaultValue={category?.publish_fee_lkr ?? 0} /></Field>
        <Field label={t("sort")} htmlFor={`${p}sort`}><Input id={`${p}sort`} name="sort_order" type="number" min={0} defaultValue={category?.sort_order ?? 0} /></Field>
      </div>
      <label className="flex min-h-12 items-center gap-2">
        <input type="checkbox" name="is_active" defaultChecked={category?.is_active ?? true} className="size-5 accent-[var(--primary)]" /> {t("active")}
      </label>
      <SubmitButton size="sm">{category ? t("save") : t("create")}</SubmitButton>
    </form>
  );
}
