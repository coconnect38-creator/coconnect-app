import { getTranslations, setRequestLocale } from "next-intl/server";
import { jobAdminAction, resolveReport, setHidden, userAction } from "@/actions/admin";
import { ActionButton } from "@/components/admin/action-button";
import { Badge, Card } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { requireStaff } from "@/lib/auth";
import { getPublicProfiles } from "@/lib/data/jobs";
import { formatRelative } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export default async function AdminReportsPage({ params, searchParams }: PageProps<"/[locale]/admin/reports">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  await requireStaff(locale);
  const sp = await searchParams;
  const status = sp.status === "all" ? null : "open";
  const supabase = await createClient();
  let q = supabase.from("reports").select("*").order("created_at", { ascending: true }).limit(100);
  if (status) q = q.eq("status", status);
  const { data: reports } = await q;
  const ids = (type: string) => (reports ?? []).filter((r) => r.target_type === type).map((r) => r.target_id);
  const [jobs, threads, reviews] = await Promise.all([
    ids("job").length ? supabase.from("jobs").select("id, title, description, status, publisher_id").in("id", ids("job")) : Promise.resolve({ data: [] }),
    ids("thread").length ? supabase.from("job_threads").select("id, body, author_id, job_id, is_hidden").in("id", ids("thread")) : Promise.resolve({ data: [] }),
    ids("review").length ? supabase.from("reviews").select("id, comment, rating, reviewer_id, is_hidden").in("id", ids("review")) : Promise.resolve({ data: [] }),
  ]);
  const people = await getPublicProfiles([
    ...(reports ?? []).map((r) => r.reporter_id),
    ...ids("profile"),
    ...(threads.data ?? []).map((x) => x.author_id),
    ...(reviews.data ?? []).map((x) => x.reviewer_id),
    ...(jobs.data ?? []).map((x) => x.publisher_id),
  ]);
  const t = await getTranslations("admin.reports");
  const tr = await getTranslations("report.reasons");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <Link href={{ pathname: "/admin/reports", query: status ? { status: "all" } : {} }} className="text-sm font-semibold underline">
          {status ? t("showAll") : t("showOpen")}
        </Link>
      </div>
      {!reports?.length ? <Card className="text-muted-foreground">{t("empty")}</Card> : null}
      {reports?.map((r) => {
        const job = r.target_type === "job" ? jobs.data?.find((x) => x.id === r.target_id) : null;
        const thread = r.target_type === "thread" ? threads.data?.find((x) => x.id === r.target_id) : null;
        const review = r.target_type === "review" ? reviews.data?.find((x) => x.id === r.target_id) : null;
        const profile = r.target_type === "profile" ? people.get(r.target_id) : null;
        const offender = job?.publisher_id ?? thread?.author_id ?? review?.reviewer_id ?? (profile ? r.target_id : null);
        return (
          <Card key={r.id} className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge tone="danger">{tr(r.reason as "spam")}</Badge>
              <Badge>{t(`types.${r.target_type as "job"}`)}</Badge>
              {r.status !== "open" ? <Badge tone="green">{r.status}</Badge> : null}
              <span className="text-muted-foreground">{t("by", { name: people.get(r.reporter_id)?.full_name ?? "—", time: formatRelative(r.created_at, locale) })}</span>
            </div>
            {r.details ? <p className="text-sm italic">“{r.details}”</p> : null}
            <div className="rounded-lg border border-border bg-muted/50 p-3 text-sm">
              {job ? (
                <>
                  <Link href={`/jobs/${job.id}`} className="font-semibold underline">{job.title}</Link>
                  <p className="line-clamp-4 whitespace-pre-line">{job.description}</p>
                </>
              ) : thread ? (
                <>
                  <p className="whitespace-pre-line">{thread.body}</p>
                  <p className="text-xs text-muted-foreground">— {people.get(thread.author_id)?.full_name} {thread.is_hidden ? `· ${t("hidden")}` : ""}</p>
                </>
              ) : review ? (
                <>
                  <p>{"★".repeat(review.rating)} {review.comment}</p>
                  <p className="text-xs text-muted-foreground">— {people.get(review.reviewer_id)?.full_name} {review.is_hidden ? `· ${t("hidden")}` : ""}</p>
                </>
              ) : profile ? (
                <Link href={`/profile/${r.target_id}`} className="font-semibold underline">{profile.full_name}</Link>
              ) : (
                <p className="text-muted-foreground">{t("gone")}</p>
              )}
            </div>
            <div className="flex flex-wrap items-start gap-2">
              {thread ? <ActionButton action={setHidden.bind(null, "thread", thread.id, !thread.is_hidden)} label={thread.is_hidden ? t("unhide") : t("hide")} variant="danger" /> : null}
              {review ? <ActionButton action={setHidden.bind(null, "review", review.id, !review.is_hidden)} label={review.is_hidden ? t("unhide") : t("hide")} variant="danger" /> : null}
              {job && job.status === "published" ? <ActionButton action={jobAdminAction.bind(null, job.id, "unpublish")} label={t("unpublish")} reason={t("reason")} variant="danger" /> : null}
              {offender ? <ActionButton action={userAction.bind(null, offender, "suspend")} label={t("suspend")} reason={t("reason")} variant="ghost" /> : null}
              {r.status === "open" ? (
                <>
                  <ActionButton action={resolveReport.bind(null, r.id, "actioned")} label={t("actioned")} variant="primary" />
                  <ActionButton action={resolveReport.bind(null, r.id, "dismissed")} label={t("dismiss")} />
                </>
              ) : (
                <ActionButton action={resolveReport.bind(null, r.id, "open")} label={t("reopen")} variant="ghost" />
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
