import { Briefcase, Gavel, Search, UserCog } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { Alert, Card } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { isProfileComplete, requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage({ params }: PageProps<"/[locale]/dashboard">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const viewer = await requireViewer(locale);
  const supabase = await createClient();
  const [jobs, bids, awards] = await Promise.all([
    supabase.from("jobs").select("id", { count: "exact", head: true }).eq("publisher_id", viewer.id).in("status", ["published", "in_progress", "pending_review", "pending_payment"]),
    supabase.from("bids").select("id", { count: "exact", head: true }).eq("bidder_id", viewer.id).in("status", ["pending", "shortlisted"]),
    supabase.from("awards").select("id", { count: "exact", head: true }).or(`worker_id.eq.${viewer.id},publisher_id.eq.${viewer.id}`).is("cancelled_at", null).is("completed_at", null),
  ]);
  const t = await getTranslations("dashboard");
  const stats = [
    { label: t("activeJobs"), value: jobs.count ?? 0, href: "/dashboard/my-jobs", icon: Briefcase },
    { label: t("openBids"), value: bids.count ?? 0, href: "/dashboard/my-bids", icon: Gavel },
    { label: t("activeAwards"), value: awards.count ?? 0, href: "/dashboard/my-bids", icon: UserCog },
  ];
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("hello", { name: viewer.profile.full_name.split(" ")[0] })}</h1>
      {!isProfileComplete(viewer.profile) ? (
        <Alert className="flex flex-wrap items-center justify-between gap-2">
          <span>{t("completeProfile")}</span>
          <Link href="/dashboard/settings" className={buttonVariants({ size: "sm" })}>{t("completeNow")}</Link>
        </Alert>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-3">
        {stats.map(({ label, value, href, icon: Icon }) => (
          <Link key={label} href={href}>
            <Card className="hover:shadow-sm">
              <Icon className="size-5 text-clay" aria-hidden />
              <p className="mt-2 text-3xl font-bold">{value}</p>
              <p className="text-sm text-muted-foreground">{label}</p>
            </Card>
          </Link>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/jobs/new" className={buttonVariants({ variant: "clay", size: "lg" })}><Briefcase className="size-5" aria-hidden /> {t("postJob")}</Link>
        <Link href="/jobs" className={buttonVariants({ size: "lg" })}><Search className="size-5" aria-hidden /> {t("findWork")}</Link>
      </div>
    </div>
  );
}
