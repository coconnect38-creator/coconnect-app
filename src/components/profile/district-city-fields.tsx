"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import type { Locale } from "@/i18n/routing";
import { localName } from "@/lib/format";

type Opt = { id: number; name_en: string; name_si: string | null; name_ta: string | null };
type CityOpt = Opt & { district_id: number };

/** Two-level district → town picker. Faster than a map on a slow phone; works without GPS. */
export function DistrictCityFields({
  districts,
  cities,
  defaultDistrict,
  defaultCity,
  districtError,
  required = false,
}: {
  districts: Opt[];
  cities: CityOpt[];
  defaultDistrict?: number | null;
  defaultCity?: string | null;
  districtError?: string;
  required?: boolean;
}) {
  const t = useTranslations("location");
  const locale = useLocale() as Locale;
  const [district, setDistrict] = useState<number | "">(defaultDistrict ?? "");
  const options = cities.filter((c) => c.district_id === district);
  const sorted = [...districts].sort((a, b) => localName(a, locale).localeCompare(localName(b, locale), locale));
  const knownCity = options.some((c) => c.name_en === defaultCity);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label={t("district")} htmlFor="district_id" error={districtError}>
        <Select
          id="district_id"
          name="district_id"
          value={district}
          required={required}
          onChange={(e) => setDistrict(e.target.value ? Number(e.target.value) : "")}
          aria-invalid={Boolean(districtError)}
        >
          <option value="">{t("chooseDistrict")}</option>
          {sorted.map((d) => (
            <option key={d.id} value={d.id}>
              {localName(d, locale)}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={t("town")} htmlFor="city" hint={t("townHint")}>
        {options.length ? (
          <Select id="city" name="city" defaultValue={knownCity ? (defaultCity ?? "") : ""} key={district}>
            <option value="">{t("chooseTown")}</option>
            {options.map((c) => (
              <option key={c.id} value={c.name_en}>
                {localName(c, locale)}
              </option>
            ))}
          </Select>
        ) : (
          <Input id="city" name="city" defaultValue={defaultCity ?? ""} maxLength={80} disabled={!district} />
        )}
      </Field>
    </div>
  );
}
