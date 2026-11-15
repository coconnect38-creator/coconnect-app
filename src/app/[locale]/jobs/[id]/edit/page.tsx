import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { JobForm } from "@/components/jobs/job-form";
import { Alert } from "@/components/ui/card";
import { redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { requireViewer } from "@/lib/auth";
import { getCategories, getCities, getDistricts, getPublicSettings } from "@/lib/data/reference";
import { createClient } from "@/lib/supabase/server";
import { EDITABLE_STATUSES } from "@/lib/jobs";


export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("jobForm");
  return { title: t("editTitle"), robots: { index: false } };
}

export default async function EditJobPage({ params }: PageProps<"/[locale]/jobs/[id]/edit">) {
  const { locale: l, id } = await params;
  const locale = l as Locale;
  setRequestLocale(locale);
  const viewer = await requireViewer(locale, `/jobs/${id}/edit`);
  const supabase = await createClient();
  const { data: job } = await supabase.from("jobs").select("*, job_images(id, storage_path, sort_order)").eq("id", id).maybeSingle();
  if (!job || job.publisher_id !== viewer.id) notFound();
  if (!EDITABLE_STATUSES.includes(job.status)) redirect({ href: `/dashboard/my-jobs/${id}`, locale });

  const [t, categories, districts, cities, settings] = await Promise.all([
    getTranslations("jobForm"),
    getCategories(),
    getDistricts(),
    getCities(),
    getPublicSettings(),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold">{t("editTitle")}</h1>
      {job.status === "rejected" && job.reject_reason ? (
        <Alert tone="danger" className="mb-4">
          <p className="font-semibold">{t("rejectedBecause")}</p>
          <p>{job.reject_reason}</p>
        </Alert>
      ) : null}
      <JobForm
        initial={{
          ...job,
          suggested_rate: Number(job.suggested_rate),
          images: [...job.job_images].sort((a, b) => a.sort_order - b.sort_order),
        }}
        categories={categories}
        districts={districts}
        cities={cities}
        feesEnabled={settings.fees_enabled}
      />
    </div>
  );
}
