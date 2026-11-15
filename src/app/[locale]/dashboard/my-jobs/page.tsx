import { Plus } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { requireViewer } from "@/lib/auth";
import { formatLKR, formatRelative } from "@/lib/format";
import { statusTone } from "@/lib/jobs";
import { createClient } from "@/lib/supabase/server";

export default async function MyJobsPage({ params }: PageProps<"/[locale]/dashboard/my-jobs">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const viewer = await requireViewer(locale);
  const supabase = await createClient();
  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, title, status, bid_count, suggested_rate, rate_unit, created_at, published_at")
    .eq("publisher_id", viewer.id)
    .order("created_at", { ascending: false });
  const [t, ts, tu] = await Promise.all([getTranslations("myJobs"), getTranslations("jobStatus"), getTranslations("rateUnit")]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <Link href="/jobs/new" className={buttonVariants({ size: "sm", variant: "clay" })}>
          <Plus className="size-4" aria-hidden /> {t("new")}
        </Link>
      </div>
      {jobs?.length ? (
        <ul className="space-y-2">
          {jobs.map((j) => (
            <li key={j.id}>
              <Link href={`/dashboard/my-jobs/${j.id}`} className="block">
                <Card className="flex flex-wrap items-center gap-3 p-4 hover:shadow-sm sm:p-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{j.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatLKR(j.suggested_rate)} {tu(j.rate_unit)} · {formatRelative(j.published_at ?? j.created_at, locale)}
                    </p>
                  </div>
                  <span className="text-sm font-semibold">{t("bids", { count: j.bid_count })}</span>
                  <Badge tone={statusTone[j.status]}>{ts(j.status)}</Badge>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <Card className="text-center">
          <p className="font-semibold">{t("empty")}</p>
          <Link href="/jobs/new" className={buttonVariants({ variant: "clay", className: "mt-3" })}>{t("postFirst")}</Link>
        </Card>
      )}
    </div>
  );
}
