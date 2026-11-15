import { setRequestLocale } from "next-intl/server";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import type { Locale } from "@/i18n/routing";
import { requireViewer } from "@/lib/auth";

export default async function DashboardLayout({ children, params }: LayoutProps<"/[locale]/dashboard">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  await requireViewer(locale, "/dashboard");
  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 md:grid-cols-[200px_1fr]">
      <aside>
        <DashboardNav />
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
