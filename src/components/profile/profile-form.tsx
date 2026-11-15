"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { updateProfile } from "@/actions/profile";
import { FormError, SubmitButton, useFieldError } from "@/components/forms/form-bits";
import { Alert } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import type { OwnProfile } from "@/lib/auth";
import { DistrictCityFields } from "./district-city-fields";

type Opt = { id: number; name_en: string; name_si: string | null; name_ta: string | null };

export function ProfileForm({ profile, districts, cities }: { profile: OwnProfile; districts: Opt[]; cities: (Opt & { district_id: number })[] }) {
  const t = useTranslations("settings");
  const [state, action] = useActionState(updateProfile, null);
  const err = useFieldError(state);
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormError state={state} />
      {state?.ok ? <Alert tone="success">{t("profileSaved")}</Alert> : null}
      <Field label={t("fullName")} htmlFor="full_name" error={err("full_name")}>
        <Input id="full_name" name="full_name" defaultValue={profile.full_name} required maxLength={80} />
      </Field>
      <DistrictCityFields districts={districts} cities={cities} defaultDistrict={profile.district_id} defaultCity={profile.city} districtError={err("district_id")} />
      <Field label={t("bio")} htmlFor="bio" hint={t("bioHint")} error={err("bio")}>
        <Textarea id="bio" name="bio" defaultValue={profile.bio ?? ""} maxLength={1000} />
      </Field>
      {profile.is_broker ? (
        <Field label={t("crewSize")} htmlFor="crew_size" hint={t("crewSizeHint")} error={err("crew_size")}>
          <Input id="crew_size" name="crew_size" type="number" inputMode="numeric" min={1} max={1000} defaultValue={profile.crew_size ?? ""} />
        </Field>
      ) : null}
      <Field label={t("language")} htmlFor="preferred_lang" hint={t("languageHint")}>
        <Select id="preferred_lang" name="preferred_lang" defaultValue={profile.preferred_lang}>
          <option value="en">English</option>
          <option value="si">සිංහල</option>
          <option value="ta">தமிழ்</option>
        </Select>
      </Field>
      <SubmitButton>{t("saveProfile")}</SubmitButton>
    </form>
  );
}
