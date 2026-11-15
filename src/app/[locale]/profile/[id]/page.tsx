import { BadgeCheck, Briefcase, MapPin, Users } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { JobCard } from "@/components/jobs/job-card";
import { Avatar } from "@/components/profile/avatar";
import { Stars } from "@/components/reviews/stars";
import { ReportButton } from "@/components/threads/report-button";
import { Badge, Card } from "@/components/ui/card";
import type { Locale } from "@/i18n/routing";
import { getViewer } from "@/lib/auth";
import { getPublicProfiles, JOB_CARD_SELECT, type JobCardData } from "@/lib/data/jobs";
import { getCategories, getDistricts } from "@/lib/data/reference";
import { formatDate, formatRelative, localName } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

async function load(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  return (await getPublicProfiles([id])).get(id) ?? null;
}

export async function generateMetadata({ params }: PageProps<"/[locale]/profile/[id]">): Promise<Metadata> {
  const p = await load((await params).id);
  return p ? { title: p.full_name ?? undefined } : {};
}

export default async function ProfilePage({ params }: PageProps<"/[locale]/profile/[id]">) {
  const { locale: l, id } = await params;
  const locale = l as Locale;
  setRequestLocale(locale);
  const profile = await load(id);
  if (!profile) notFound();
  const supabase = await createClient();
  const [t, viewer, districts, categories, reviewsRes, jobsRes] = await Promise.all([
    getTranslations("profile"),
    getViewer(),
    getDistricts(),
    getCategories(),
    supabase.from("reviews").select("id, rating, comment, created_at, reviewer_id").eq("reviewee_id", id).eq("is_hidden", false).order("created_at", { ascending: false }).limit(50),
    supabase.from("jobs").select(JOB_CARD_SELECT).eq("publisher_id", id).eq("status", "published").order("published_at", { ascending: false }).limit(6),
  ]);
  const reviews = reviewsRes.data ?? [];
  const reviewers = await getPublicProfiles(reviews.map((r) => r.reviewer_id));
  const district = districts.find((d) => d.id === profile.district_id);
  const jobs = (jobsRes.data ?? []) as unknown as JobCardData[];

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6">
      <Card className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Avatar name={profile.full_name ?? ""} path={profile.avatar_url} size={88} />
        <div className="min-w-0 flex-1 space-y-1">
          <h1 className="text-2xl font-bold">{profile.full_name}</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {district ? <span className="flex items-center gap-1"><MapPin className="size-4" aria-hidden />{[profile.city, localName(district, locale)].filter(Boolean).join(", ")}</span> : null}
            <span>{t("memberSince", { date: formatDate(profile.created_at, locale, { month: "long", year: "numeric" }) })}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {profile.rating_count ? <Stars value={Number(profile.rating_avg)} count={profile.rating_count} size="md" /> : <span className="text-sm text-muted-foreground">{t("noReviews")}</span>}
            {profile.is_broker ? (
              <Badge tone="clay">
                {profile.broker_verified ? <BadgeCheck className="size-3.5" aria-hidden /> : <Users className="size-3.5" aria-hidden />}
                {profile.broker_verified ? t("verifiedBroker") : t("broker")}
                {profile.crew_size ? ` · ${t("crew", { count: profile.crew_size })}` : ""}
              </Badge>
            ) : null}
            <Badge><Briefcase className="size-3.5" aria-hidden /> {t("completed", { count: profile.jobs_completed ?? 0 })}</Badge>
          </div>
        </div>
        {viewer && viewer.id !== id ? <ReportButton targetType="profile" targetId={id} /> : null}
      </Card>
      {profile.bio ? (
        <Card>
          <h2 className="mb-2 font-bold">{t("about")}</h2>
          <p className="whitespace-pre-line">{profile.bio}</p>
        </Card>
      ) : null}
      <section className="space-y-3">
        <h2 className="text-lg font-bold">{t("reviews", { count: reviews.length })}</h2>
        {reviews.length ? (
          <ul className="space-y-3">
            {reviews.map((r) => {
              const by = reviewers.get(r.reviewer_id);
              return (
                <li key={r.id}>
                  <Card className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Stars value={r.rating} />
                      <span className="text-xs text-muted-foreground">{formatRelative(r.created_at, locale)}</span>
                    </div>
                    {r.comment ? <p className="whitespace-pre-line">{r.comment}</p> : null}
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm text-muted-foreground">— {by?.full_name ?? t("member")}</p>
                      {viewer ? <ReportButton targetType="review" targetId={r.id} /> : null}
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-muted-foreground">{t("noReviewsYet")}</p>
        )}
      </section>
      {jobs.length ? (
        <section className="space-y-3">
          <h2 className="text-lg font-bold">{t("openJobs")}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {jobs.map((j) => <JobCard key={j.id} job={j} districts={districts} categories={categories} />)}
          </div>
        </section>
      ) : null}
    </div>
  );
}
