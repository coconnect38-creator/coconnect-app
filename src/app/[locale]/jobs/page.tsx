import { MapPin, SlidersHorizontal } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdSlot } from "@/components/ads/ad-slot";
import { JobCard } from "@/components/jobs/job-card";
import { JobFilters } from "@/components/jobs/job-filters";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getViewer } from "@/lib/auth";
import { PAGE_SIZE, searchJobs } from "@/lib/data/jobs";
import { categoryWithChildren, getCategories, getDistricts } from "@/lib/data/reference";
import { localName } from "@/lib/format";

export async function generateMetadata({ params }: PageProps<"/[locale]/jobs">): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale as Locale, namespace: "jobs" });
  return { title: t("title"), description: t("subtitle") };
}

const str = (x: string | string[] | undefined) => (typeof x === "string" && x.trim() ? x.trim() : undefined);
const int = (x: string | string[] | undefined) => {
  const n = Number(str(x));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : undefined;
};
const date = (x: string | string[] | undefined) => (str(x) && /^\d{4}-\d{2}-\d{2}$/.test(str(x)!) ? str(x) : undefined);

export default async function JobsPage({ params, searchParams }: PageProps<"/[locale]/jobs">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const sp = await searchParams;
  const [t, districts, categories, viewer] = await Promise.all([getTranslations("jobs"), getDistricts(), getCategories(), getViewer()]);

  const category = int(sp.category);
  const district = int(sp.district);
  const sort = (["newest", "closing", "rate"] as const).find((s) => s === sp.sort) ?? "newest";
  const { jobs, total, page } = await searchJobs({
    q: str(sp.q),
    district,
    categoryIds: category ? categoryWithChildren(categories, category) : undefined,
    minRate: int(sp.min),
    maxRate: int(sp.max),
    startFrom: date(sp.from),
    startTo: date(sp.to),
    sort,
    page: int(sp.page),
  });
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const values = { q: str(sp.q), district: str(sp.district), category: str(sp.category), min: str(sp.min), max: str(sp.max), from: str(sp.from), to: str(sp.to), sort };
  const pageHref = (p: number) => ({ pathname: "/jobs" as const, query: { ...Object.fromEntries(Object.entries(values).filter(([, v]) => v)), page: String(p) } });
  const myDistrict = viewer?.profile.district_id ? districts.find((d) => d.id === viewer.profile.district_id) : null;
  const districtName = district ? localName(districts.find((d) => d.id === district), locale) : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{districtName ? t("titleIn", { district: districtName }) : t("title")}</h1>
          <p className="text-muted-foreground">{t("resultCount", { count: total })}</p>
        </div>
        {myDistrict && district !== myDistrict.id ? (
          <Link href={{ pathname: "/jobs", query: { district: String(myDistrict.id) } }} className={buttonVariants({ variant: "outline", size: "sm" })}>
            <MapPin className="size-4" aria-hidden /> {t("nearMe", { district: localName(myDistrict, locale) })}
          </Link>
        ) : null}
      </div>
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside>
          <details className="lg:hidden">
            <summary className="mb-3 flex min-h-12 cursor-pointer list-none items-center gap-2 rounded-lg border border-border bg-card px-4 font-semibold [&::-webkit-details-marker]:hidden">
              <SlidersHorizontal className="size-5" aria-hidden /> {t("filters.toggle")}
            </summary>
            <JobFilters districts={districts} categories={categories} values={values} idPrefix="m-" />
          </details>
          <div className="hidden lg:block">
            <JobFilters districts={districts} categories={categories} values={values} idPrefix="d-" />
          </div>
        </aside>
        <section aria-label={t("results")} className="space-y-4">
          {jobs.length ? (
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {jobs.map((job, i) => (
                <li key={job.id} className={i === 5 ? "contents" : undefined}>
                  {i === 5 ? (
                    <>
                      <div className="sm:col-span-2 xl:col-span-3">
                        <AdSlot slot="listing_inline" districtId={district} categoryId={category} />
                      </div>
                      <JobCard job={job} districts={districts} categories={categories} />
                    </>
                  ) : (
                    <JobCard job={job} districts={districts} categories={categories} />
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
              <p className="text-lg font-semibold">{t("empty")}</p>
              <p className="mt-1 text-muted-foreground">{t("emptyHint")}</p>
              <Link href="/jobs/new" className={buttonVariants({ variant: "clay", className: "mt-4" })}>{t("beFirst")}</Link>
            </div>
          )}
          {pages > 1 ? (
            <nav className="flex items-center justify-center gap-2" aria-label={t("pagination")}>
              {page > 1 ? <Link href={pageHref(page - 1)} className={buttonVariants({ variant: "outline", size: "sm" })}>{t("prev")}</Link> : null}
              <span className="px-3 text-sm">{t("pageOf", { page, pages })}</span>
              {page < pages ? <Link href={pageHref(page + 1)} className={buttonVariants({ variant: "outline", size: "sm" })}>{t("next")}</Link> : null}
            </nav>
          ) : null}
        </section>
      </div>
    </div>
  );
}
