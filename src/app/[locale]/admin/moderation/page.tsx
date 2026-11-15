import { AlertTriangle } from "lucide-react";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { reviewJob } from "@/actions/admin";
import { ActionButton } from "@/components/admin/action-button";
import { Alert, Badge, Card } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { requireStaff } from "@/lib/auth";
import { getPublicProfiles } from "@/lib/data/jobs";
import { getCategories, getDistricts } from "@/lib/data/reference";
import { formatDate, formatLKR, formatRelative, localName } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { storageUrl } from "@/lib/utils";

const PRESETS = ["contact", "minWage", "unclear", "category", "scam", "duplicate"] as const;

export default async function ModerationPage({ params }: PageProps<"/[locale]/admin/moderation">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const viewer = await requireStaff(locale);
  const supabase = await createClient();
  // Oldest first; a moderator's own jobs are hidden (conflict of interest).
  const { data: jobs } = await supabase
    .from("jobs")
    .select("*, job_images(storage_path, sort_order)")
    .eq("status", "pending_review")
    .neq("publisher_id", viewer.id)
    .order("submitted_at", { ascending: true })
    .limit(50);
  const [t, tu, districts, categories, publishers] = await Promise.all([
    getTranslations("admin.moderation"),
    getTranslations("rateUnit"),
    getDistricts(),
    getCategories(true),
    getPublicProfiles((jobs ?? []).map((j) => j.publisher_id)),
  ]);
  const presets = PRESETS.map((p) => t(`presets.${p}`));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("title", { count: jobs?.length ?? 0 })}</h1>
      {!jobs?.length ? <Card className="text-muted-foreground">{t("empty")}</Card> : null}
      {jobs?.map((j) => {
        const cat = categories.find((c) => c.id === j.category_id);
        const dist = districts.find((d) => d.id === j.district_id);
        const pub = publishers.get(j.publisher_id);
        return (
          <Card key={j.id} className="space-y-3">
            {j.contact_flags.length ? (
              <Alert tone="danger" className="flex gap-2">
                <AlertTriangle className="size-5 shrink-0" aria-hidden />
                <div>
                  <p className="font-semibold">{t("flagged")}</p>
                  <p className="font-mono text-xs break-all">{j.contact_flags.join(" · ")}</p>
                </div>
              </Alert>
            ) : null}
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-clay">{cat ? localName(cat, locale) : "—"}</p>
                <h2 className="text-lg font-bold break-words">{j.title}</h2>
                <p className="text-sm text-muted-foreground">
                  {[j.address_hint, j.city, dist ? localName(dist, locale) : null].filter(Boolean).join(", ")} · {t("submitted", { time: formatRelative(j.submitted_at ?? j.created_at, locale) })}
                </p>
              </div>
              <Badge>{formatLKR(j.suggested_rate)} {tu(j.rate_unit)}</Badge>
            </div>
            <p className="text-sm break-words whitespace-pre-line">{j.description}</p>
            <p className="text-sm text-muted-foreground">
              {t("meta", { workers: j.workers_needed ?? "—", days: j.days_needed ?? "—", start: j.start_date ? formatDate(j.start_date, locale) : "—" })}
            </p>
            {j.job_images.length ? (
              <div className="flex gap-2 overflow-x-auto">
                {j.job_images.map((img) => (
                  <a key={img.storage_path} href={storageUrl("job-images", img.storage_path)!} target="_blank" rel="noreferrer" className="relative size-24 shrink-0 overflow-hidden rounded-lg bg-muted">
                    <Image src={storageUrl("job-images", img.storage_path)!} alt="" fill sizes="96px" className="object-cover" />
                  </a>
                ))}
              </div>
            ) : null}
            <p className="text-sm">
              {t("publisher")}: <Link href={`/profile/${j.publisher_id}`} className="font-semibold underline">{pub?.full_name ?? "—"}</Link>
              {pub ? ` · ${t("rating", { avg: Number(pub.rating_avg).toFixed(1), count: pub.rating_count ?? 0 })}` : null}
            </p>
            <div className="flex flex-wrap items-start gap-2 border-t border-border pt-3">
              <ActionButton action={reviewJob.bind(null, j.id, true)} label={t("approve")} variant="primary" size="md" />
              <ActionButton action={reviewJob.bind(null, j.id, false)} label={t("reject")} variant="danger" size="md" reason={t("rejectReason")} presets={presets} />
            </div>
          </Card>
        );
      })}
    </div>
  );
}
