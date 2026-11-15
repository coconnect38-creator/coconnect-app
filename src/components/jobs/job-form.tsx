"use client";

import { AlertTriangle, Check, ImagePlus, LocateFixed, X } from "lucide-react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { saveJob } from "@/actions/jobs";
import { Captcha } from "@/components/forms/captcha";
import { FormError, SubmitButton, useFieldError } from "@/components/forms/form-bits";
import { DistrictCityFields } from "@/components/profile/district-city-fields";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import type { Locale } from "@/i18n/routing";
import { compressImage } from "@/lib/compress-image";
import { detectContactInfo } from "@/lib/contact-detect";
import { formatLKR, localName } from "@/lib/format";
import { cn, storageUrl } from "@/lib/utils";

type Named = { id: number; name_en: string; name_si: string | null; name_ta: string | null };
type Cat = Named & { parent_id: number | null; default_rate_unit: string; publish_fee_lkr: number };
type RateUnit = "per_worker_per_day" | "per_day" | "per_project";

export type JobFormInitial = {
  id?: string;
  category_id?: number;
  district_id?: number;
  city?: string | null;
  address_hint?: string | null;
  title?: string;
  description?: string;
  workers_needed?: number | null;
  days_needed?: number | null;
  suggested_rate?: number;
  rate_unit?: RateUnit;
  start_date?: string | null;
  is_date_flexible?: boolean;
  lat?: number | null;
  lng?: number | null;
  images?: { id: string; storage_path: string }[];
};

const STEPS = ["category", "location", "details", "rate", "photos", "review"] as const;
const FIELD_STEP: Record<string, number> = {
  category_id: 0, district_id: 1, city: 1, address_hint: 1, title: 2, description: 2, workers_needed: 2,
  days_needed: 2, start_date: 2, suggested_rate: 3, rate_unit: 3,
};
const MAX_PHOTOS = 5;

export function JobForm({
  initial,
  categories,
  districts,
  cities,
  feesEnabled,
}: {
  initial: JobFormInitial;
  categories: Cat[];
  districts: Named[];
  cities: (Named & { district_id: number })[];
  feesEnabled: boolean;
}) {
  const t = useTranslations("jobForm");
  const tu = useTranslations("rateUnit");
  const locale = useLocale() as Locale;
  const [state, formAction] = useActionState(saveJob, null);
  const err = useFieldError(state);
  const formRef = useRef<HTMLFormElement>(null);
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Record<string, string>>({});
  const [photos, setPhotos] = useState<File[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const [rateUnit, setRateUnit] = useState<RateUnit>(initial.rate_unit ?? "per_worker_per_day");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    initial.lat && initial.lng ? { lat: initial.lat, lng: initial.lng } : null,
  );

  // Jump to the first step with a server-side validation error.
  const [seen, setSeen] = useState(state);
  if (state !== seen) {
    setSeen(state);
    if (state && !state.ok && state.fieldErrors) {
      const steps = Object.keys(state.fieldErrors).map((k) => FIELD_STEP[k] ?? 5);
      if (steps.length) setStep(Math.min(...steps));
    }
  }

  const previews = useMemo(() => photos.map((f) => URL.createObjectURL(f)), [photos]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  const parents = categories.filter((c) => c.parent_id === null);
  const existing = (initial.images ?? []).filter((i) => !removed.includes(i.id));
  const photoRoom = MAX_PHOTOS - existing.length - photos.length;
  const flags = detectContactInfo(`${values.title ?? initial.title ?? ""} ${values.description ?? initial.description ?? ""} ${values.address_hint ?? ""}`);
  const selectedCat = categories.find((c) => String(c.id) === (values.category_id ?? String(initial.category_id ?? "")));
  const fee = feesEnabled && selectedCat ? Number(selectedCat.publish_fee_lkr) : 0;

  const sync = () => {
    if (!formRef.current) return;
    const fd = new FormData(formRef.current);
    const next: Record<string, string> = {};
    for (const [k, v] of fd.entries()) if (typeof v === "string") next[k] = v;
    setValues(next);
  };

  const validateStep = (i: number) => {
    const fs = formRef.current?.querySelector<HTMLFieldSetElement>(`fieldset[data-step="${i}"]`);
    if (!fs) return true;
    for (const el of Array.from(fs.elements) as HTMLInputElement[]) {
      if (typeof el.checkValidity === "function" && !el.checkValidity()) {
        el.reportValidity();
        return false;
      }
    }
    return true;
  };

  const go = (i: number) => {
    if (i > step) for (let s = step; s < i; s++) if (!validateStep(s)) return setStep(s);
    sync();
    setStep(i);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const addPhotos = async (list: FileList | null) => {
    if (!list) return;
    const picked = Array.from(list).slice(0, Math.max(0, photoRoom));
    const compressed = await Promise.all(picked.map((f) => compressImage(f)));
    setPhotos((p) => [...p, ...compressed]);
  };

  const locate = () =>
    navigator.geolocation?.getCurrentPosition(
      (pos) => setCoords({ lat: Math.round(pos.coords.latitude * 100) / 100, lng: Math.round(pos.coords.longitude * 100) / 100 }),
      () => setCoords(null),
      { enableHighAccuracy: false, timeout: 10000 },
    );

  const v = (k: keyof JobFormInitial) => values[k as string] ?? (initial[k] != null ? String(initial[k]) : "");

  return (
    <form
      ref={formRef}
      onChange={sync}
      action={(fd) => {
        fd.delete("photos");
        photos.forEach((p) => fd.append("photos", p));
        return formAction(fd);
      }}
      className="scroll-mt-20 space-y-6"
      noValidate
    >
      <input type="hidden" name="job_id" value={initial.id ?? ""} />
      <input type="hidden" name="lat" value={coords?.lat ?? ""} />
      <input type="hidden" name="lng" value={coords?.lng ?? ""} />
      {removed.map((id) => (
        <input key={id} type="hidden" name="remove_image" value={id} />
      ))}

      <ol className="flex gap-1 overflow-x-auto pb-1" aria-label={t("stepsLabel")}>
        {STEPS.map((s, i) => (
          <li key={s} className="flex-1">
            <button
              type="button"
              onClick={() => go(i)}
              aria-current={i === step ? "step" : undefined}
              className={cn(
                "flex w-full min-w-20 flex-col items-start gap-1 rounded-lg border-t-4 px-1 pt-2 text-left text-xs font-semibold",
                i < step ? "border-primary text-primary" : i === step ? "border-clay" : "border-border text-muted-foreground",
              )}
            >
              <span>{i + 1}</span>
              <span className="truncate">{t(`steps.${s}`)}</span>
            </button>
          </li>
        ))}
      </ol>

      <FormError state={state} />

      {/* 1 · Category */}
      <fieldset data-step={0} hidden={step !== 0} className="space-y-4">
        <legend className="text-xl font-bold">{t("categoryTitle")}</legend>
        {err("category_id") ? <p className="text-sm text-danger">{err("category_id")}</p> : null}
        {parents.map((p) => {
          const children = categories.filter((c) => c.parent_id === p.id);
          const options = children.length ? children : [p];
          return (
            <div key={p.id} className="space-y-2">
              <p className="font-semibold text-muted-foreground">{localName(p, locale)}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {options.map((c) => (
                  <label
                    key={c.id}
                    className="flex min-h-14 cursor-pointer items-center gap-3 rounded-lg border border-border bg-card px-4 has-[:checked]:border-primary has-[:checked]:bg-success-bg"
                  >
                    <input
                      type="radio"
                      name="category_id"
                      value={c.id}
                      required
                      defaultChecked={initial.category_id === c.id}
                      onChange={() => setRateUnit(c.default_rate_unit as RateUnit)}
                      className="size-5 accent-[var(--primary)]"
                    />
                    <span className="font-medium">{localName(c, locale)}</span>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </fieldset>

      {/* 2 · Location */}
      <fieldset data-step={1} hidden={step !== 1} className="space-y-4">
        <legend className="text-xl font-bold">{t("locationTitle")}</legend>
        <DistrictCityFields
          districts={districts}
          cities={cities}
          defaultDistrict={initial.district_id}
          defaultCity={initial.city}
          districtError={err("district_id")}
          required
        />
        <Field label={t("addressHint")} htmlFor="address_hint" hint={t("addressHintHelp")} error={err("address_hint")}>
          <Input id="address_hint" name="address_hint" maxLength={120} defaultValue={initial.address_hint ?? ""} />
        </Field>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" size="sm" onClick={locate}>
            <LocateFixed className="size-4" aria-hidden /> {t("useLocation")}
          </Button>
          {coords ? (
            <span className="flex items-center gap-2 text-sm text-success-fg">
              <Check className="size-4" aria-hidden /> {t("locationSet")}
              <button type="button" className="text-muted-foreground underline" onClick={() => setCoords(null)}>
                {t("removeLocation")}
              </button>
            </span>
          ) : null}
        </div>
        <p className="text-sm text-muted-foreground">{t("locationPrivacy")}</p>
      </fieldset>

      {/* 3 · Details */}
      <fieldset data-step={2} hidden={step !== 2} className="space-y-4">
        <legend className="text-xl font-bold">{t("detailsTitle")}</legend>
        <Field label={t("title")} htmlFor="title" hint={t("titleHint")} error={err("title")}>
          <Input id="title" name="title" required minLength={10} maxLength={120} defaultValue={initial.title ?? ""} />
        </Field>
        <Field label={t("description")} htmlFor="description" hint={t("descriptionHint")} error={err("description")}>
          <Textarea id="description" name="description" required minLength={30} maxLength={5000} rows={6} defaultValue={initial.description ?? ""} />
        </Field>
        {flags.length ? (
          <Alert className="flex gap-2">
            <AlertTriangle className="size-5 shrink-0" aria-hidden />
            <span>{t("contactWarning")}</span>
          </Alert>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("workersNeeded")} htmlFor="workers_needed" hint={t("workersHint")} error={err("workers_needed")}>
            <Input id="workers_needed" name="workers_needed" type="number" inputMode="numeric" min={1} max={1000} defaultValue={initial.workers_needed ?? ""} />
          </Field>
          <Field label={t("daysNeeded")} htmlFor="days_needed" error={err("days_needed")}>
            <Input id="days_needed" name="days_needed" type="number" inputMode="numeric" min={1} max={365} defaultValue={initial.days_needed ?? ""} />
          </Field>
          <Field label={t("startDate")} htmlFor="start_date" error={err("start_date")}>
            <Input id="start_date" name="start_date" type="date" defaultValue={initial.start_date ?? ""} />
          </Field>
          <label className="flex min-h-12 items-center gap-3 self-end">
            <input type="checkbox" name="is_date_flexible" defaultChecked={initial.is_date_flexible} className="size-5 accent-[var(--primary)]" />
            <span>{t("flexible")}</span>
          </label>
        </div>
      </fieldset>

      {/* 4 · Rate */}
      <fieldset data-step={3} hidden={step !== 3} className="space-y-4">
        <legend className="text-xl font-bold">{t("rateTitle")}</legend>
        <p className="text-muted-foreground">{t("rateExplainer")}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("suggestedRate")} htmlFor="suggested_rate" error={err("suggested_rate")}>
            <div className="flex items-center gap-2">
              <span className="font-semibold">Rs.</span>
              <Input id="suggested_rate" name="suggested_rate" type="number" inputMode="decimal" min={1} step="0.01" required defaultValue={initial.suggested_rate ?? ""} />
            </div>
          </Field>
          <Field label={t("rateUnit")} htmlFor="rate_unit" error={err("rate_unit")}>
            <Select id="rate_unit" name="rate_unit" value={rateUnit} onChange={(e) => setRateUnit(e.target.value as RateUnit)}>
              {(["per_worker_per_day", "per_day", "per_project"] as const).map((u) => (
                <option key={u} value={u}>{tu(u)}</option>
              ))}
            </Select>
          </Field>
        </div>
        <Alert tone="info">{t("minimumWage")}</Alert>
      </fieldset>

      {/* 5 · Photos */}
      <fieldset data-step={4} hidden={step !== 4} className="space-y-4">
        <legend className="text-xl font-bold">{t("photosTitle")}</legend>
        <p className="text-muted-foreground">{t("photosExplainer", { max: MAX_PHOTOS })}</p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {existing.map((img) => (
            <div key={img.id} className="relative aspect-square overflow-hidden rounded-lg bg-muted">
              <Image src={storageUrl("job-images", img.storage_path)!} alt="" fill sizes="160px" className="object-cover" />
              <button type="button" onClick={() => setRemoved((r) => [...r, img.id])} className="absolute top-1 right-1 rounded-full bg-black/60 p-1.5 text-white" aria-label={t("removePhoto")}>
                <X className="size-4" />
              </button>
            </div>
          ))}
          {previews.map((src, i) => (
            <div key={src} className="relative aspect-square overflow-hidden rounded-lg bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
              <img src={src} alt="" className="size-full object-cover" />
              <button type="button" onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))} className="absolute top-1 right-1 rounded-full bg-black/60 p-1.5 text-white" aria-label={t("removePhoto")}>
                <X className="size-4" />
              </button>
            </div>
          ))}
          {photoRoom > 0 ? (
            <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border text-sm text-muted-foreground hover:bg-muted">
              <ImagePlus className="size-6" aria-hidden />
              {t("addPhotos")}
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(e) => { void addPhotos(e.target.files); e.target.value = ""; }} />
            </label>
          ) : null}
        </div>
      </fieldset>

      {/* 6 · Review */}
      <fieldset data-step={5} hidden={step !== 5} className="space-y-4">
        <legend className="text-xl font-bold">{t("reviewTitle")}</legend>
        <dl className="divide-y divide-border rounded-lg border border-border bg-card">
          {[
            [t("steps.category"), selectedCat ? localName(selectedCat, locale) : "—"],
            [t("steps.location"), [districts.find((d) => String(d.id) === v("district_id")) && localName(districts.find((d) => String(d.id) === v("district_id")), locale), v("city")].filter(Boolean).join(", ") || "—"],
            [t("title"), v("title") || "—"],
            [t("workersNeeded"), v("workers_needed") || "—"],
            [t("daysNeeded"), v("days_needed") || "—"],
            [t("startDate"), v("start_date") || (values.is_date_flexible ? t("flexible") : "—")],
            [t("suggestedRate"), v("suggested_rate") ? `${formatLKR(v("suggested_rate"))} · ${tu(rateUnit)}` : "—"],
            [t("steps.photos"), String(existing.length + photos.length)],
          ].map(([k, val]) => (
            <div key={k} className="grid grid-cols-3 gap-2 px-4 py-3 text-sm">
              <dt className="font-semibold">{k}</dt>
              <dd className="col-span-2 break-words">{val}</dd>
            </div>
          ))}
        </dl>
        {flags.length ? <Alert>{t("contactWarning")}</Alert> : null}
        <Alert tone="info">{fee > 0 ? t("feeNotice", { fee: formatLKR(fee, { exact: true }) }) : t("moderationNotice")}</Alert>
        {step === 5 ? <Captcha resetKey={state} /> : null}
        <div className="flex flex-col gap-3 sm:flex-row">
          <SubmitButton name="intent" value="submit" className="sm:flex-1">{t("submit")}</SubmitButton>
          <SubmitButton name="intent" value="draft" variant="outline">{t("saveDraft")}</SubmitButton>
        </div>
      </fieldset>

      {step < 5 ? (
        <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
          <Button type="button" variant="ghost" onClick={() => go(step - 1)} disabled={step === 0}>
            {t("back")}
          </Button>
          <div className="flex gap-2">
            <SubmitButton name="intent" value="draft" variant="outline" formNoValidate>{t("saveDraft")}</SubmitButton>
            <Button type="button" onClick={() => go(step + 1)}>{t("next")}</Button>
          </div>
        </div>
      ) : null}
    </form>
  );
}
