import { ExternalLink, Pencil } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AwardActions } from "@/components/awards/award-actions";
import { ContactCard, type Contact } from "@/components/awards/contact-card";
import { BidRowActions } from "@/components/bids/bid-row-actions";
import { OwnerActions } from "@/components/jobs/owner-actions";
import { SlipUploadForm } from "@/components/payments/slip-upload-form";
import { Avatar } from "@/components/profile/avatar";
import { ReviewForm } from "@/components/reviews/review-form";
import { Stars } from "@/components/reviews/stars";
import { buttonVariants } from "@/components/ui/button";
import { Alert, Badge, Card } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { requireViewer } from "@/lib/auth";
import { getPublicProfiles } from "@/lib/data/jobs";
import { getCategories, getPublicSettings } from "@/lib/data/reference";
import { formatDate, formatLKR, formatRelative } from "@/lib/format";
import { bidTone, CANCELLABLE_STATUSES, EDITABLE_STATUSES, statusTone } from "@/lib/jobs";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const SORTS = ["total", "rate", "rating", "newest"] as const;

export default async function ManageJobPage({ params, searchParams }: PageProps<"/[locale]/dashboard/my-jobs/[id]">) {
  const { locale: l, id } = await params;
  const locale = l as Locale;
  setRequestLocale(locale);
  const viewer = await requireViewer(locale);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const { data: job } = await supabase.from("jobs").select("*").eq("id", id).eq("publisher_id", viewer.id).maybeSingle();
  if (!job) notFound();
  const sp = await searchParams;
  const sort = SORTS.find((s) => s === sp.sort) ?? "total";

  const [t, ts, tb, tu, settings, categories, bidsRes, awardsRes, paymentsRes, myReviewsRes] = await Promise.all([
    getTranslations("manage"),
    getTranslations("jobStatus"),
    getTranslations("bidStatus"),
    getTranslations("rateUnit"),
    getPublicSettings(),
    getCategories(),
    supabase.from("bids").select("*").eq("job_id", id),
    supabase.from("awards").select("*").eq("job_id", id).order("awarded_at"),
    supabase.from("payments").select("id, amount_lkr, status, reject_reason, created_at, method").eq("job_id", id).order("created_at", { ascending: false }),
    supabase.from("reviews").select("reviewee_id").eq("job_id", id).eq("reviewer_id", viewer.id),
  ]);
  const bids = bidsRes.data ?? [];
  const awards = awardsRes.data ?? [];
  const activeAwards = awards.filter((a) => !a.cancelled_at);
  const profiles = await getPublicProfiles(bids.map((b) => b.bidder_id));
  const contacts: Contact[] = activeAwards.length ? ((await supabase.rpc("get_job_contact", { p_job_id: id })).data ?? []) : [];
  const reviewed = new Set((myReviewsRes.data ?? []).map((r) => r.reviewee_id));

  const rank = (b: (typeof bids)[number]) => (b.status === "accepted" ? 0 : b.status === "shortlisted" ? 1 : b.status === "pending" ? 2 : 3);
  const sorted = [...bids].sort((a, b) => {
    if (rank(a) !== rank(b)) return rank(a) - rank(b);
    if (sort === "rate") return Number(a.rate) - Number(b.rate);
    if (sort === "rating") return Number(profiles.get(b.bidder_id)?.rating_avg ?? 0) - Number(profiles.get(a.bidder_id)?.rating_avg ?? 0);
    if (sort === "newest") return b.created_at.localeCompare(a.created_at);
    return Number(a.total_amount ?? 0) - Number(b.total_amount ?? 0);
  });
  const filled = activeAwards.reduce((n, a) => n + a.workers_count, 0);
  const category = categories.find((c) => c.id === job.category_id);
  const pendingPayment = (paymentsRes.data ?? []).find((p) => p.status === "pending");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href="/dashboard/my-jobs" className="text-sm text-muted-foreground hover:underline">← {t("back")}</Link>
          <h1 className="text-2xl font-bold break-words">{job.title}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge tone={statusTone[job.status]}>{ts(job.status)}</Badge>
            <span>{formatLKR(job.suggested_rate)} {tu(job.rate_unit)}</span>
            <span>· {t("views", { count: job.views_count })}</span>
          </div>
        </div>
        <div className="flex gap-2">
          {EDITABLE_STATUSES.includes(job.status) ? (
            <Link href={`/jobs/${id}/edit`} className={buttonVariants({ variant: "outline", size: "sm" })}>
              <Pencil className="size-4" aria-hidden /> {t("edit")}
            </Link>
          ) : null}
          <Link href={`/jobs/${id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
            <ExternalLink className="size-4" aria-hidden /> {t("viewPublic")}
          </Link>
        </div>
      </div>

      {sp.submitted ? <Alert tone="success">{job.status === "pending_payment" ? t("submittedPay") : t("submitted")}</Alert> : null}
      {sp.saved ? <Alert tone="success">{t("saved")}</Alert> : null}
      {job.status === "draft" ? <Alert>{t("draftNotice")}</Alert> : null}
      {job.status === "pending_review" ? <Alert>{t("reviewNotice")}</Alert> : null}
      {job.status === "rejected" ? (
        <Alert tone="danger">
          <p className="font-semibold">{t("rejectedNotice")}</p>
          {job.reject_reason ? <p>{job.reject_reason}</p> : null}
        </Alert>
      ) : null}
      {job.status === "expired" ? <Alert>{t("expiredNotice")}</Alert> : null}
      {job.status === "published" && job.expires_at ? <p className="text-sm text-muted-foreground">{t("expires", { date: formatDate(job.expires_at, locale) })}</p> : null}

      {job.status === "pending_payment" ? (
        <Card className="space-y-4">
          <h2 className="text-lg font-bold">{t("paymentTitle")}</h2>
          <p>{t("paymentIntro")}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-muted p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase">{t("amount")}</p>
              <p className="text-3xl font-bold">{formatLKR(category?.publish_fee_lkr ?? 0, { exact: true })}</p>
            </div>
            <div className="rounded-lg bg-muted p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase">{t("reference")}</p>
              <p className="font-mono text-3xl font-bold tracking-widest">{job.payment_ref}</p>
            </div>
          </div>
          <dl className="grid gap-1 text-sm sm:grid-cols-2">
            <div><dt className="inline font-semibold">{t("bank")}: </dt><dd className="inline">{settings.bank_details.bank || "—"}</dd></div>
            <div><dt className="inline font-semibold">{t("branch")}: </dt><dd className="inline">{settings.bank_details.branch || "—"}</dd></div>
            <div><dt className="inline font-semibold">{t("accountName")}: </dt><dd className="inline">{settings.bank_details.name || "—"}</dd></div>
            <div><dt className="inline font-semibold">{t("accountNo")}: </dt><dd className="inline font-mono">{settings.bank_details.account || "—"}</dd></div>
          </dl>
          {pendingPayment ? (
            <Alert tone="info">{t("slipPending")}</Alert>
          ) : (
            <SlipUploadForm jobId={id} reference={job.payment_ref ?? ""} />
          )}
          {(paymentsRes.data ?? []).filter((p) => p.status === "rejected").map((p) => (
            <Alert key={p.id} tone="danger">{t("slipRejected", { reason: p.reject_reason ?? "" })}</Alert>
          ))}
        </Card>
      ) : null}

      <Card className="space-y-3">
        <OwnerActions
          jobId={id}
          canSubmit={job.status === "draft" || job.status === "rejected"}
          canCancel={CANCELLABLE_STATUSES.includes(job.status) && activeAwards.length === 0}
          canDelete={job.status === "draft"}
          canClose={job.status === "published" && activeAwards.length > 0}
        />
      </Card>

      {awards.length ? (
        <section className="space-y-3">
          <h2 className="text-lg font-bold">
            {t("awardsTitle")}{" "}
            {job.workers_needed ? <span className="text-sm font-medium text-muted-foreground">{t("filled", { filled, needed: job.workers_needed })}</span> : null}
          </h2>
          {job.status === "published" && activeAwards.length ? <Alert tone="info">{t("partialNotice")}</Alert> : null}
          <div className="grid gap-3 md:grid-cols-2">
            {contacts.map((c) => {
              const award = activeAwards.find((a) => a.id === c.award_id)!;
              return (
                <Card key={c.award_id} className="space-y-3">
                  <ContactCard contact={c} />
                  <AwardActions award={award} viewerId={viewer.id} />
                  {award.completed_at && !reviewed.has(c.user_id) ? <ReviewForm jobId={id} revieweeId={c.user_id} revieweeName={c.full_name} /> : null}
                </Card>
              );
            })}
          </div>
          {awards.filter((a) => a.cancelled_at).length ? (
            <p className="text-sm text-muted-foreground">{t("cancelledAwards", { count: awards.filter((a) => a.cancelled_at).length })}</p>
          ) : null}
        </section>
      ) : null}

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold">{t("bidsTitle", { count: bids.length })}</h2>
          {bids.length > 1 ? (
            <nav className="flex flex-wrap gap-1 text-sm" aria-label={t("sortLabel")}>
              {SORTS.map((s) => (
                <Link
                  key={s}
                  href={{ pathname: `/dashboard/my-jobs/${id}`, query: { sort: s } }}
                  className={cn("rounded-full px-3 py-1.5 font-semibold", s === sort ? "bg-primary text-primary-foreground" : "bg-muted")}
                >
                  {t(`sort.${s}`)}
                </Link>
              ))}
            </nav>
          ) : null}
        </div>
        {!bids.length ? (
          <p className="text-muted-foreground">{job.status === "published" ? t("noBidsYet") : t("noBids")}</p>
        ) : (
          <ul className="space-y-3">
            {sorted.map((b) => {
              const p = profiles.get(b.bidder_id);
              return (
                <li key={b.id}>
                  <Card className={cn("grid gap-3 sm:grid-cols-[1fr_auto]", (b.status === "rejected" || b.status === "withdrawn") && "opacity-60")}>
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link href={`/profile/${b.bidder_id}`} className="flex items-center gap-2 font-bold hover:underline">
                          <Avatar name={p?.full_name ?? "?"} path={p?.avatar_url} size={36} />
                          {p?.full_name ?? t("unknownBidder")}
                        </Link>
                        {p?.is_broker ? <Badge tone="clay">{p.broker_verified ? t("verifiedBroker") : t("broker")}</Badge> : null}
                        <Badge tone={bidTone[b.status]}>{tb(b.status)}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {p?.rating_count ? <Stars value={Number(p.rating_avg)} count={p.rating_count} /> : t("noReviews")} · {t("completedJobs", { count: p?.jobs_completed ?? 0 })}
                      </p>
                      <p>
                        <span className="text-xl font-bold text-primary">{formatLKR(b.rate)}</span>{" "}
                        <span className="text-sm text-muted-foreground">{tu(b.rate_unit)}</span>
                      </p>
                      <p className="text-sm">
                        {t("bidMeta", { workers: b.workers_offered, days: b.days_offered ?? "—" })} · <strong>{t("total", { total: formatLKR(b.total_amount) })}</strong>
                        {b.can_start_on ? <> · {t("canStart", { date: formatDate(b.can_start_on, locale) })}</> : null}
                      </p>
                      {b.message ? <p className="rounded-lg bg-muted p-3 text-sm break-words whitespace-pre-line">{b.message}</p> : null}
                      <p className="text-xs text-muted-foreground">{formatRelative(b.created_at, locale)}</p>
                    </div>
                    {job.status === "published" ? <BidRowActions bidId={b.id} status={b.status} bidderName={p?.full_name ?? ""} /> : null}
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
