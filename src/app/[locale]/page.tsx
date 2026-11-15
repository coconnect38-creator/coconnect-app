import { BadgeCheck, EyeOff, ShieldCheck, Star } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdSlot } from "@/components/ads/ad-slot";
import { DistrictMap } from "@/components/home/district-map";
import { HowItWorks } from "@/components/home/how-it-works";
import { RateCalculator } from "@/components/home/rate-calculator";
import { JobCard } from "@/components/jobs/job-card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getViewer } from "@/lib/auth";
import { getHomeStats, getRecentJobs } from "@/lib/data/jobs";
import { getCategories, getDistricts } from "@/lib/data/reference";
import { formatLKR, formatNumber, localName } from "@/lib/format";

const CHIPS = ["coconut-plucking", "masonry", "carpentry", "land-clearing"];
const FAQ = ["free", "contact", "choose", "broker", "pay", "safety"] as const;

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const viewer = await getViewer();
  const myDistrict = viewer?.profile.district_id ?? null;
  const [t, districts, categories, home, recent] = await Promise.all([
    getTranslations("home"),
    getDistricts(),
    getCategories(),
    getHomeStats(myDistrict),
    getRecentJobs(8, myDistrict),
  ]);
  const stats = home.stats;
  const openJobs = Number(stats?.open_jobs ?? 0);
  const districtStats = new Map(home.districts.map((d) => [d.district_id, d]));
  const mapData = districts.map((d) => ({
    ...d,
    open_jobs: Number(districtStats.get(d.id)?.open_jobs ?? 0),
    avg_daily_rate: districtStats.get(d.id)?.avg_daily_rate ? Number(districtStats.get(d.id)!.avg_daily_rate) : null,
  }));
  const catCounts = new Map(home.categories.map((c) => [c.category_id, Number(c.open_jobs)]));
  const chips = CHIPS.map((slug) => categories.find((c) => c.slug === slug)).filter((c) => !!c);
  const parents = categories.filter((c) => c.parent_id === null);
  const sortedDistricts = [...districts].sort((a, b) => localName(a, locale).localeCompare(localName(b, locale), locale));
  const myDistrictRow = myDistrict ? districts.find((d) => d.id === myDistrict) : null;
  const section = "mx-auto max-w-6xl px-4 py-12 sm:py-16";

  return (
    <>
      {/* 1 · Hero: a search bar, not a slogan */}
      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:py-16">
          <h1 className="max-w-3xl text-2xl leading-tight font-bold sm:text-5xl">{t("hero.title")}</h1>
          <form action={`/${locale}/jobs`} method="get" className="mt-6 space-y-4 rounded-2xl bg-background p-4 text-foreground sm:p-5">
            <fieldset>
              <legend className="sr-only">{t("hero.category")}</legend>
              <div className="flex flex-wrap gap-2">
                {chips.map((c, i) => (
                  <label key={c.id} className="cursor-pointer">
                    <input type="radio" name="category" value={c.id} defaultChecked={i === 0} className="peer sr-only" />
                    <span className="inline-flex min-h-11 items-center rounded-full border border-border px-4 text-sm font-semibold peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-ring">
                      {localName(c, locale)}
                    </span>
                  </label>
                ))}
                <label className="cursor-pointer">
                  <input type="radio" name="category" value="" className="peer sr-only" />
                  <span className="inline-flex min-h-11 items-center rounded-full border border-border px-4 text-sm font-semibold peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-ring">
                    {t("hero.all")}
                  </span>
                </label>
              </div>
            </fieldset>
            <div className="flex flex-col gap-3 sm:flex-row">
              <label htmlFor="hero-district" className="sr-only">{t("hero.district")}</label>
              <Select id="hero-district" name="district" defaultValue={myDistrict ?? ""} className="sm:flex-1">
                <option value="">{t("hero.anyDistrict")}</option>
                {sortedDistricts.map((d) => <option key={d.id} value={d.id}>{localName(d, locale)}</option>)}
              </Select>
              <Button type="submit" size="lg" variant="clay">{t("hero.search")}</Button>
            </div>
          </form>
          <p className="mt-4 text-base font-semibold text-sand sm:text-lg">
            {openJobs > 0
              ? [
                  t("hero.openJobs", { count: openJobs }),
                  myDistrictRow ? t("hero.inDistrict", { count: Number(stats?.district_jobs ?? 0), district: localName(myDistrictRow, locale) }) : null,
                  stats?.avg_daily_rate ? t("hero.avgRate", { rate: formatLKR(stats.avg_daily_rate) }) : null,
                ].filter(Boolean).join(" · ")
              : t("hero.empty")}
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 pt-6">
        <AdSlot slot="home_hero" districtId={myDistrict} />
      </div>

      {/* 3 · Live job feed (before the map on mobile: proof first) */}
      <section className={section} aria-labelledby="feed-title">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <h2 id="feed-title" className="text-2xl font-bold sm:text-3xl">{myDistrictRow ? t("feed.titleNear", { district: localName(myDistrictRow, locale) }) : t("feed.title")}</h2>
          <Link href="/jobs" className="font-semibold text-primary underline">{t("feed.all")}</Link>
        </div>
        {recent.length ? (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {recent.map((job) => (
              <li key={job.id}><JobCard job={job} districts={districts} categories={categories} /></li>
            ))}
          </ul>
        ) : (
          <div className="rounded-2xl border-2 border-dashed border-border bg-card p-8 text-center">
            <p className="text-xl font-bold">{t("feed.emptyTitle")}</p>
            <p className="mt-1 text-muted-foreground">{t("feed.emptyBody")}</p>
            <Link href="/jobs/new" className={buttonVariants({ variant: "clay", size: "lg", className: "mt-4" })}>{t("feed.emptyCta")}</Link>
          </div>
        )}
      </section>

      {/* 2 · District map */}
      <section className="bg-muted/60">
        <div className={section}>
          <h2 className="mb-2 text-2xl font-bold sm:text-3xl">{t("map.title")}</h2>
          <p className="mb-6 text-muted-foreground">{t("map.subtitle")}</p>
          <DistrictMap districts={mapData} />
        </div>
      </section>

      {/* 4 · How it works */}
      <section className={section} aria-labelledby="how-title">
        <h2 id="how-title" className="mb-6 text-center text-2xl font-bold sm:text-3xl">{t("how.title")}</h2>
        <HowItWorks />
      </section>

      {/* 5 · Rate calculator */}
      <section className="bg-sand/50">
        <div className={section}>
          <h2 className="mb-2 text-2xl font-bold sm:text-3xl">{t("calc.title")}</h2>
          <p className="mb-6 text-muted-foreground">{t("calc.subtitle")}</p>
          <RateCalculator categories={categories} fallbackRate={stats?.avg_daily_rate ? Number(stats.avg_daily_rate) : null} />
        </div>
      </section>

      {/* 6 · Trust */}
      <section className={section} aria-labelledby="trust-title">
        <h2 id="trust-title" className="mb-6 text-2xl font-bold sm:text-3xl">{t("trust.title")}</h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {([
            [ShieldCheck, "moderated"],
            [BadgeCheck, "verified"],
            [Star, "ratings"],
            [EyeOff, "private"],
          ] as const).map(([Icon, k]) => (
            <li key={k} className="rounded-xl border border-border bg-card p-5">
              <Icon className="mb-3 size-7 text-primary" aria-hidden />
              <p className="font-bold">{t(`trust.${k}.title`)}</p>
              <p className="text-sm text-muted-foreground">{t(`trust.${k}.body`)}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* 7 · Categories + FAQ */}
      <section className="bg-muted/60">
        <div className={section}>
          <h2 className="mb-6 text-2xl font-bold sm:text-3xl">{t("categories.title")}</h2>
          <div className="grid gap-6 md:grid-cols-2">
            {parents.map((p) => (
              <div key={p.id} className="rounded-xl border border-border bg-card p-5">
                <Link href={{ pathname: "/jobs", query: { category: String(p.id) } }} className="flex items-center justify-between text-lg font-bold hover:underline">
                  {localName(p, locale)} <span className="text-sm font-semibold text-clay">{t("categories.count", { count: catCounts.get(p.id) ?? 0 })}</span>
                </Link>
                <ul className="mt-3 divide-y divide-border">
                  {categories.filter((c) => c.parent_id === p.id).map((c) => (
                    <li key={c.id}>
                      <Link href={{ pathname: "/jobs", query: { category: String(c.id) } }} className="flex min-h-11 items-center justify-between hover:text-primary">
                        <span>{localName(c, locale)}</span>
                        <span className="text-sm text-muted-foreground">{formatNumber(catCounts.get(c.id) ?? 0, locale)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={section} aria-labelledby="faq-title">
        <h2 id="faq-title" className="mb-6 text-2xl font-bold sm:text-3xl">{t("faq.title")}</h2>
        <div className="divide-y divide-border rounded-xl border border-border bg-card">
          {FAQ.map((k) => (
            <details key={k} className="group p-4">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 font-semibold [&::-webkit-details-marker]:hidden">
                {t(`faq.${k}.q`)}
                <span className="text-xl text-muted-foreground transition-transform group-open:rotate-45" aria-hidden>+</span>
              </summary>
              <p className="pt-2 text-muted-foreground">{t(`faq.${k}.a`)}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
