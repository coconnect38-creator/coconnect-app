import { getTranslations, setRequestLocale } from "next-intl/server";
import { jobAdminAction } from "@/actions/admin";
import { ActionButton } from "@/components/admin/action-button";
import { Button } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { requireStaff } from "@/lib/auth";
import { formatDate, formatLKR } from "@/lib/format";
import { statusTone, type JobStatus } from "@/lib/jobs";
import { createClient } from "@/lib/supabase/server";

const STATUSES: JobStatus[] = ["draft", "pending_payment", "pending_review", "published", "rejected", "in_progress", "completed", "cancelled", "expired"];

export default async function AdminJobsPage({ params, searchParams }: PageProps<"/[locale]/admin/jobs">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  await requireStaff(locale);
  const sp = await searchParams;
  const status = STATUSES.find((s) => s === sp.status);
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 80) : "";
  const supabase = await createClient();
  let query = supabase.from("jobs").select("id, title, status, suggested_rate, bid_count, is_featured, expires_at, created_at").order("created_at", { ascending: false }).limit(100);
  if (status) query = query.eq("status", status);
  if (q) query = /^[0-9a-f-]{36}$/i.test(q) ? query.eq("id", q) : query.ilike("search_text", `%${q.toLowerCase().replace(/[\\%_]/g, (m) => `\\${m}`)}%`);
  const { data: jobs } = await query;
  const [t, ts] = await Promise.all([getTranslations("admin.jobs"), getTranslations("jobStatus")]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <form method="get" className="flex flex-wrap gap-2">
        <Input name="q" defaultValue={q} placeholder={t("search")} className="max-w-xs" aria-label={t("search")} />
        <Select name="status" defaultValue={status ?? ""} className="max-w-48" aria-label={t("status")}>
          <option value="">{t("allStatuses")}</option>
          {STATUSES.map((s) => <option key={s} value={s}>{ts(s)}</option>)}
        </Select>
        <Button type="submit" variant="outline">{t("filter")}</Button>
      </form>
      <ul className="space-y-2">
        {jobs?.map((j) => (
          <li key={j.id}>
            <Card className="space-y-2 p-4 sm:p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/jobs/${j.id}`} className="min-w-0 flex-1 truncate font-semibold hover:underline">{j.title}</Link>
                {j.is_featured ? <Badge tone="clay">{t("featured")}</Badge> : null}
                <Badge tone={statusTone[j.status]}>{ts(j.status)}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {formatLKR(j.suggested_rate)} · {t("bids", { count: j.bid_count })} · {t("created", { date: formatDate(j.created_at, locale) })}
                {j.expires_at ? ` · ${t("expires", { date: formatDate(j.expires_at, locale) })}` : ""}
              </p>
              <div className="flex flex-wrap items-start gap-2">
                {j.status === "published" ? (
                  <>
                    <ActionButton action={jobAdminAction.bind(null, j.id, j.is_featured ? "unfeature" : "feature")} label={j.is_featured ? t("unfeature") : t("feature")} />
                    <ActionButton action={jobAdminAction.bind(null, j.id, "unpublish")} label={t("unpublish")} reason={t("reason")} variant="danger" />
                  </>
                ) : null}
                {j.status === "published" || j.status === "expired" ? (
                  <ActionButton action={jobAdminAction.bind(null, j.id, "extend")} label={t("extend")} reason={t("extendDays")} inputType="number" />
                ) : null}
                {j.status !== "completed" && j.status !== "cancelled" ? (
                  <ActionButton action={jobAdminAction.bind(null, j.id, "cancel")} label={t("cancel")} reason={t("reason")} variant="ghost" />
                ) : null}
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
