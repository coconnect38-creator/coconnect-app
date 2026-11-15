import { CalendarDays, Clock, MapPin, Users } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdSlot } from "@/components/ads/ad-slot";
import { AwardActions } from "@/components/awards/award-actions";
import { ContactCard, type Contact } from "@/components/awards/contact-card";
import { BidForm } from "@/components/bids/bid-form";
import { LiveBidStats } from "@/components/jobs/live-bid-stats";
import { Avatar } from "@/components/profile/avatar";
import { ReviewForm } from "@/components/reviews/review-form";
import { Stars } from "@/components/reviews/stars";
import { ReportButton } from "@/components/threads/report-button";
import { ThreadList } from "@/components/threads/thread-list";
import { buttonVariants } from "@/components/ui/button";
import { Alert, Badge, Card } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getViewer } from "@/lib/auth";
import { getPublicProfiles } from "@/lib/data/jobs";
import { getCategories, getDistricts } from "@/lib/data/reference";
import { formatDate, formatLKR, formatRelative, localName } from "@/lib/format";
import { statusTone } from "@/lib/jobs";
import { siteUrl } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";
import { storageUrl } from "@/lib/utils";

async function loadJob(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("jobs").select("*, job_images(id, storage_path, sort_order)").eq("id", id).maybeSingle();
  return data;
}

export async function generateMetadata({ params }: PageProps<"/[locale]/jobs/[id]">): Promise<Metadata> {
  const { id } = await params;
  const job = await loadJob(id);
  if (!job) return {};
  const cover = job.job_images.sort((a, b) => a.sort_order - b.sort_order)[0];
  return {
    title: job.title,
    description: job.description.slice(0, 160),
    openGraph: cover ? { images: [storageUrl("job-images", cover.storage_path)!] } : undefined,
    robots: job.status === "published" ? undefined : { index: false },
  };
}

export default async function JobPage({ params }: PageProps<"/[locale]/jobs/[id]">) {
  const { locale: l, id } = await params;
  const locale = l as Locale;
  setRequestLocale(locale);
  const job = await loadJob(id);
  if (!job) notFound();

  const [t, tu, ts, viewer, districts, categories] = await Promise.all([
    getTranslations("jobDetail"),
    getTranslations("rateUnit"),
    getTranslations("jobStatus"),
    getViewer(),
    getDistricts(),
    getCategories(),
  ]);
  const supabase = await createClient();
  const isOwner = viewer?.id === job.publisher_id;

  const [profiles, myBidRes, awardsRes, myReviewsRes] = await Promise.all([
    getPublicProfiles([job.publisher_id]),
    viewer && !isOwner
      ? supabase.from("bids").select("id, rate, rate_unit, workers_offered, days_offered, message, can_start_on, status, total_amount").eq("job_id", id).eq("bidder_id", viewer.id).maybeSingle()
      : Promise.resolve({ data: null }),
    viewer ? supabase.from("awards").select("*").eq("job_id", id) : Promise.resolve({ data: [] }),
    viewer ? supabase.from("reviews").select("reviewee_id").eq("job_id", id).eq("reviewer_id", viewer.id) : Promise.resolve({ data: [] }),
  ]);
  const publisher = profiles.get(job.publisher_id);
  const myAwards = (awardsRes.data ?? []).filter((a) => viewer && (a.worker_id === viewer.id || a.publisher_id === viewer.id));
  const activeAwards = myAwards.filter((a) => !a.cancelled_at);
  // Layer 3: phone numbers only ever come from get_job_contact().
  const contacts: Contact[] = activeAwards.length ? ((await supabase.rpc("get_job_contact", { p_job_id: id })).data ?? []) : [];
  const reviewed = new Set((myReviewsRes.data ?? []).map((r) => r.reviewee_id));
  const pendingReviews = activeAwards
    .filter((a) => a.completed_at)
    .map((a) => (viewer!.id === a.publisher_id ? a.worker_id : a.publisher_id))
    .filter((uid) => !reviewed.has(uid));
  const revieweeNames = pendingReviews.length ? await getPublicProfiles(pendingReviews) : new Map();

  if (job.status === "published" && !isOwner) {
    after(async () => {
      await supabase.rpc("record_job_view", { p_job_id: id });
    });
  }

  const district = districts.find((d) => d.id === job.district_id);
  const category = categories.find((c) => c.id === job.category_id);
  const images = [...job.job_images].sort((a, b) => a.sort_order - b.sort_order);
  const open = job.status === "published" && !job.hiring_closed_at;
  const isBroker = viewer?.roles.includes("broker") ?? false;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: job.description,
    datePosted: job.published_at,
    validThrough: job.expires_at,
    employmentType: "TEMPORARY",
    hiringOrganization: { "@type": "Organization", name: "CoConnect", sameAs: siteUrl() },
    jobLocation: { "@type": "Place", address: { "@type": "PostalAddress", addressLocality: job.city ?? undefined, addressRegion: district?.name_en, addressCountry: "LK" } },
    baseSalary: { "@type": "MonetaryAmount", currency: "LKR", value: { "@type": "QuantitativeValue", value: Number(job.suggested_rate), unitText: job.rate_unit === "per_project" ? "PROJECT" : "DAY" } },
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      {job.status === "published" ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      ) : null}
      {isOwner ? (
        <Alert tone="info" className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <span>{t("ownerNotice")} <Badge tone={statusTone[job.status]}>{ts(job.status)}</Badge></span>
          <Link href={`/dashboard/my-jobs/${id}`} className={buttonVariants({ size: "sm" })}>{t("manage")}</Link>
        </Alert>
      ) : job.status !== "published" ? (
        <Alert className="mb-4">{t("notOpen", { status: ts(job.status) })}</Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <article className="min-w-0 space-y-6">
          {images.length ? (
            <div className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              {images.map((img, i) => (
                <div key={img.id} className="relative aspect-[4/3] w-[85%] shrink-0 snap-center overflow-hidden rounded-xl bg-muted sm:w-[70%]">
                  <Image src={storageUrl("job-images", img.storage_path)!} alt={t("photoAlt", { n: i + 1 })} fill sizes="(min-width: 1024px) 560px, 85vw" className="object-cover" priority={i === 0} />
                </div>
              ))}
            </div>
          ) : null}

          <header className="space-y-2">
            {category ? <p className="text-sm font-semibold text-clay">{localName(category, locale)}</p> : null}
            <h1 className="text-2xl font-bold sm:text-3xl">{job.title}</h1>
            <p className="flex items-center gap-1 text-muted-foreground">
              <MapPin className="size-4" aria-hidden />
              {[job.address_hint, job.city, district ? localName(district, locale) : null].filter(Boolean).join(", ")}
            </p>
            <p className="text-3xl font-bold text-primary">
              {formatLKR(job.suggested_rate)} <span className="text-base font-medium text-muted-foreground">{tu(job.rate_unit)}</span>
            </p>
            <p className="text-sm text-muted-foreground">{t("suggestedNote")}</p>
          </header>

          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { icon: Users, label: t("workersNeeded"), value: job.workers_needed ?? t("flexibleValue") },
              { icon: CalendarDays, label: t("days"), value: job.days_needed ?? t("flexibleValue") },
              { icon: CalendarDays, label: t("start"), value: job.start_date ? formatDate(job.start_date, locale) : t("flexibleValue") },
              { icon: Clock, label: t("posted"), value: job.published_at ? formatRelative(job.published_at, locale) : "—" },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="rounded-lg border border-border bg-card p-3">
                <dt className="flex items-center gap-1 text-xs font-semibold text-muted-foreground"><Icon className="size-3.5" aria-hidden /> {label}</dt>
                <dd className="font-bold">{value}</dd>
              </div>
            ))}
          </dl>
          {job.start_date && job.is_date_flexible ? <p className="text-sm text-muted-foreground">{t("dateFlexible")}</p> : null}

          <section className="space-y-2">
            <h2 className="text-lg font-bold">{t("description")}</h2>
            <p className="break-words whitespace-pre-line">{job.description}</p>
          </section>

          {job.lat && job.lng ? (
            <a
              href={`https://www.openstreetmap.org/?mlat=${job.lat}&mlon=${job.lng}#map=13/${job.lat}/${job.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <MapPin className="size-4" aria-hidden /> {t("approxMap")}
            </a>
          ) : null}

          <Card>
            <ThreadList jobId={id} publisherId={job.publisher_id} viewerId={viewer?.id ?? null} canPost={Boolean(viewer) && (job.status === "published" || isOwner)} />
            {!viewer ? (
              <p className="mt-4 text-sm">
                <Link href={{ pathname: "/login", query: { next: `/${locale}/jobs/${id}` } }} className="font-semibold text-primary underline">{t("loginToAsk")}</Link>
              </p>
            ) : null}
          </Card>
        </article>

        <aside className="space-y-4">
          {contacts.length ? (
            <Card className="space-y-3">
              <h2 className="font-bold">{t("contactTitle")}</h2>
              {contacts.map((c) => {
                const award = activeAwards.find((a) => a.id === c.award_id);
                return (
                  <div key={c.award_id} className="space-y-2">
                    <ContactCard contact={c} />
                    {award ? <AwardActions award={award} viewerId={viewer!.id} /> : null}
                  </div>
                );
              })}
            </Card>
          ) : null}

          {pendingReviews.map((uid) => (
            <Card key={uid}>
              <ReviewForm jobId={id} revieweeId={uid} revieweeName={revieweeNames.get(uid)?.full_name ?? ""} />
            </Card>
          ))}

          <Card className="space-y-4">
            <LiveBidStats jobId={id} initialCount={job.bid_count} initialLowest={job.lowest_rate} unitLabel={tu(job.rate_unit)} />
            {isOwner ? null : !viewer ? (
              open ? (
                <Link href={{ pathname: "/login", query: { next: `/${locale}/jobs/${id}` } }} className={buttonVariants({ className: "w-full" })}>
                  {t("loginToBid")}
                </Link>
              ) : null
            ) : open || myBidRes.data ? (
              <BidForm jobId={id} jobRateUnit={job.rate_unit} jobDays={job.days_needed} isBroker={isBroker} existing={myBidRes.data} />
            ) : (
              <p className="text-sm text-muted-foreground">{t("closed")}</p>
            )}
            {job.expires_at && open ? <p className="text-xs text-muted-foreground">{t("closes", { date: formatDate(job.expires_at, locale) })}</p> : null}
          </Card>

          {publisher ? (
            <Card className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase">{t("postedBy")}</p>
              <Link href={`/profile/${publisher.id}`} className="flex items-center gap-3 hover:underline">
                <Avatar name={publisher.full_name ?? ""} path={publisher.avatar_url} size={48} />
                <div>
                  <p className="font-bold">{publisher.full_name}</p>
                  {publisher.rating_count ? <Stars value={Number(publisher.rating_avg)} count={publisher.rating_count ?? 0} /> : <p className="text-sm text-muted-foreground">{t("noReviews")}</p>}
                </div>
              </Link>
              <p className="text-xs text-muted-foreground">{t("contactPrivacy")}</p>
            </Card>
          ) : null}

          {viewer && !isOwner ? (
            <div className="text-right">
              <ReportButton targetType="job" targetId={id} />
            </div>
          ) : null}

          <AdSlot slot="job_sidebar" districtId={job.district_id} categoryId={job.category_id} />
        </aside>
      </div>
    </div>
  );
}
