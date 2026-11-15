import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function AdminDashboard({ params }: PageProps<"/[locale]/admin">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const viewer = await requireStaff(locale);
  const supabase = await createClient();
  const { data } = await supabase.rpc("admin_dashboard_counts");
  const c = data?.[0];
  const t = await getTranslations("admin.dashboard");
  const tiles = [
    { label: t("pendingReview"), value: c?.jobs_pending_review, href: "/admin/moderation", show: true },
    { label: t("pendingPayments"), value: c?.payments_pending, href: "/admin/payments", show: viewer.isAdmin },
    { label: t("openReports"), value: c?.reports_open, href: "/admin/reports", show: true },
    { label: t("signupsToday"), value: c?.signups_today, href: "/admin/users", show: viewer.isAdmin },
    { label: t("awardsWeek"), value: c?.awards_this_week, href: "/admin/jobs", show: true },
    { label: t("published"), value: c?.jobs_published, href: "/admin/jobs?status=published", show: true },
  ].filter((x) => x.show);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {tiles.map((x) => (
          <Link key={x.label} href={x.href}>
            <Card className="hover:shadow-sm">
              <p className="text-3xl font-bold">{x.value ?? 0}</p>
              <p className="text-sm text-muted-foreground">{x.label}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
