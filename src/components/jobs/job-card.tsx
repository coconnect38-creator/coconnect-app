import { CalendarDays, Gavel, MapPin, Users } from "lucide-react";
import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import type { JobCardData } from "@/lib/data/jobs";
import type { Category, District } from "@/lib/data/reference";
import { formatLKR, formatRelative, localName } from "@/lib/format";
import { storageUrl } from "@/lib/utils";

export async function JobCard({ job, districts, categories }: { job: JobCardData; districts: District[]; categories: Category[] }) {
  const t = await getTranslations("jobs");
  const tu = await getTranslations("rateUnit");
  const locale = (await getLocale()) as Locale;
  const district = districts.find((d) => d.id === job.district_id);
  const category = categories.find((c) => c.id === job.category_id);
  const cover = [...job.job_images].sort((a, b) => a.sort_order - b.sort_order)[0];
  const img = storageUrl("job-images", cover?.storage_path);

  return (
    <Link href={`/jobs/${job.id}`} className="group flex overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-md sm:flex-col">
      <div className="relative w-28 shrink-0 bg-sand sm:aspect-[16/9] sm:w-full">
        {img ? (
          <Image src={img} alt="" fill sizes="(min-width: 640px) 360px, 112px" className="object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center text-3xl text-primary/40" aria-hidden>
            🌴
          </div>
        )}
        {job.is_featured ? <Badge tone="clay" className="absolute top-2 left-2">{t("featured")}</Badge> : null}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-3 sm:p-4">
        {category ? <p className="text-xs font-semibold text-clay">{localName(category, locale)}</p> : null}
        <h3 className="line-clamp-2 font-bold group-hover:text-primary">{job.title}</h3>
        <p className="flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="size-4 shrink-0" aria-hidden />
          <span className="truncate">{[job.city, district ? localName(district, locale) : null].filter(Boolean).join(", ")}</span>
        </p>
        <p className="text-lg font-bold text-primary">
          {formatLKR(job.suggested_rate)} <span className="text-sm font-medium text-muted-foreground">{tu(job.rate_unit)}</span>
        </p>
        <div className="mt-auto flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {job.workers_needed ? (
            <span className="flex items-center gap-1"><Users className="size-3.5" aria-hidden />{t("workers", { count: job.workers_needed })}</span>
          ) : null}
          {job.days_needed ? (
            <span className="flex items-center gap-1"><CalendarDays className="size-3.5" aria-hidden />{t("days", { count: job.days_needed })}</span>
          ) : null}
          <span className="flex items-center gap-1"><Gavel className="size-3.5" aria-hidden />{t("bids", { count: job.bid_count })}</span>
          {job.published_at ? <span>{formatRelative(job.published_at, locale)}</span> : null}
        </div>
      </div>
    </Link>
  );
}
