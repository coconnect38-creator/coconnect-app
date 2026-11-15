import { getLocale, getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import type { Locale } from "@/i18n/routing";
import type { Category, District } from "@/lib/data/reference";
import { localName } from "@/lib/format";

/** Plain GET form: filtering works with JavaScript disabled. */
export async function JobFilters({
  districts,
  categories,
  values,
  idPrefix = "",
}: {
  districts: District[];
  categories: Category[];
  values: Record<string, string | undefined>;
  idPrefix?: string;
}) {
  const t = await getTranslations("jobs.filters");
  const locale = (await getLocale()) as Locale;
  const parents = categories.filter((c) => c.parent_id === null);
  const sortedDistricts = [...districts].sort((a, b) => localName(a, locale).localeCompare(localName(b, locale), locale));
  const label = "text-sm font-semibold";

  return (
    <form method="get" className="space-y-4 rounded-xl border border-border bg-card p-4">
      <div className="space-y-1.5">
        <label htmlFor={`${idPrefix}q`} className={label}>{t("search")}</label>
        <Input id={`${idPrefix}q`} name="q" type="search" defaultValue={values.q} placeholder={t("searchPlaceholder")} />
      </div>
      <div className="space-y-1.5">
        <label htmlFor={`${idPrefix}district`} className={label}>{t("district")}</label>
        <Select id={`${idPrefix}district`} name="district" defaultValue={values.district ?? ""}>
          <option value="">{t("allDistricts")}</option>
          {sortedDistricts.map((d) => (
            <option key={d.id} value={d.id}>{localName(d, locale)}</option>
          ))}
        </Select>
      </div>
      <div className="space-y-1.5">
        <label htmlFor={`${idPrefix}category`} className={label}>{t("category")}</label>
        <Select id={`${idPrefix}category`} name="category" defaultValue={values.category ?? ""}>
          <option value="">{t("allCategories")}</option>
          {parents.map((p) => (
            <optgroup key={p.id} label={localName(p, locale)}>
              <option value={p.id}>{t("allIn", { name: localName(p, locale) })}</option>
              {categories.filter((c) => c.parent_id === p.id).map((c) => (
                <option key={c.id} value={c.id}>{localName(c, locale)}</option>
              ))}
            </optgroup>
          ))}
        </Select>
      </div>
      <fieldset className="space-y-1.5">
        <legend className={label}>{t("rate")}</legend>
        <div className="flex items-center gap-2">
          <Input name="min" type="number" inputMode="numeric" min={0} placeholder={t("min")} defaultValue={values.min} aria-label={t("min")} />
          <span aria-hidden>–</span>
          <Input name="max" type="number" inputMode="numeric" min={0} placeholder={t("max")} defaultValue={values.max} aria-label={t("max")} />
        </div>
      </fieldset>
      <fieldset className="space-y-1.5">
        <legend className={label}>{t("startDate")}</legend>
        <div className="grid grid-cols-2 gap-2">
          <Input name="from" type="date" defaultValue={values.from} aria-label={t("from")} />
          <Input name="to" type="date" defaultValue={values.to} aria-label={t("to")} />
        </div>
      </fieldset>
      <div className="space-y-1.5">
        <label htmlFor={`${idPrefix}sort`} className={label}>{t("sort")}</label>
        <Select id={`${idPrefix}sort`} name="sort" defaultValue={values.sort ?? "newest"}>
          <option value="newest">{t("sortNewest")}</option>
          <option value="closing">{t("sortClosing")}</option>
          <option value="rate">{t("sortRate")}</option>
        </Select>
      </div>
      <Button type="submit" className="w-full">{t("apply")}</Button>
    </form>
  );
}
