import { getTranslations, setRequestLocale } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { requireViewer } from "@/lib/auth";
import { formatLKR, formatRelative } from "@/lib/format";
import { bidTone } from "@/lib/jobs";
import { createClient } from "@/lib/supabase/server";

export default async function MyBidsPage({ params }: PageProps<"/[locale]/dashboard/my-bids">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const viewer = await requireViewer(locale);
  const supabase = await createClient();
  const [{ data: bids }, { data: awards }] = await Promise.all([
    supabase
      .from("bids")
      .select("id, job_id, rate, rate_unit, status, total_amount, created_at, jobs(title, status)")
      .eq("bidder_id", viewer.id)
      .order("created_at", { ascending: false }),
    supabase.from("awards").select("job_id, completed_at, cancelled_at").eq("worker_id", viewer.id),
  ]);
  const [t, tb, tu] = await Promise.all([getTranslations("myBids"), getTranslations("bidStatus"), getTranslations("rateUnit")]);
  const awarded = new Map((awards ?? []).filter((a) => !a.cancelled_at).map((a) => [a.job_id, a]));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      {bids?.length ? (
        <ul className="space-y-2">
          {bids.map((b) => {
            const award = awarded.get(b.job_id);
            return (
              <li key={b.id}>
                <Link href={`/jobs/${b.job_id}`} className="block">
                  <Card className="flex flex-wrap items-center gap-3 p-4 hover:shadow-sm sm:p-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold">{b.jobs?.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatLKR(b.rate)} {tu(b.rate_unit)} · {t("total", { total: formatLKR(b.total_amount) })} · {formatRelative(b.created_at, locale)}
                      </p>
                    </div>
                    {award ? <Badge tone="green">{award.completed_at ? t("completed") : t("awardedContact")}</Badge> : null}
                    <Badge tone={bidTone[b.status]}>{tb(b.status)}</Badge>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <Card className="text-center">
          <p className="font-semibold">{t("empty")}</p>
          <Link href="/jobs" className={buttonVariants({ className: "mt-3" })}>{t("browse")}</Link>
        </Card>
      )}
    </div>
  );
}
