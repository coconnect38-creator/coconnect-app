import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { JobForm } from "@/components/jobs/job-form";
import { Alert } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { requireViewer } from "@/lib/auth";
import { getCategories, getCities, getDistricts, getPublicSettings } from "@/lib/data/reference";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("jobForm");
  return { title: t("newTitle"), robots: { index: false } };
}

export default async function NewJobPage({ params, searchParams }: PageProps<"/[locale]/jobs/new">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const viewer = await requireViewer(locale, "/jobs/new");
  const sp = await searchParams;
  const [t, categories, districts, cities, settings] = await Promise.all([
    getTranslations("jobForm"),
    getCategories(),
    getDistricts(),
    getCities(),
    getPublicSettings(),
  ]);
  const num = (x: unknown) => (typeof x === "string" && x && !Number.isNaN(Number(x)) ? Number(x) : undefined);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="mb-1 text-2xl font-bold">{t("newTitle")}</h1>
      <p className="mb-6 text-muted-foreground">{t("newSubtitle")}</p>
      {!viewer.roles.includes("publisher") ? (
        <Alert className="mb-4">
          {t("needPublisherRole")}{" "}
          <Link href="/dashboard/settings" className="font-semibold underline">{t("goToSettings")}</Link>
        </Alert>
      ) : null}
      {!viewer.profile.phone ? (
        <Alert className="mb-4">
          {t("needPhone")}{" "}
          <Link href="/dashboard/settings" className="font-semibold underline">{t("goToSettings")}</Link>
        </Alert>
      ) : null}
      <JobForm
        initial={{
          district_id: num(sp.district) ?? viewer.profile.district_id ?? undefined,
          city: viewer.profile.city,
          category_id: num(sp.category),
          suggested_rate: num(sp.rate),
          workers_needed: num(sp.workers),
          days_needed: num(sp.days),
        }}
        categories={categories}
        districts={districts}
        cities={cities}
        feesEnabled={settings.fees_enabled}
      />
    </div>
  );
}
