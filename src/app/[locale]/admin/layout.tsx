import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminNav } from "@/components/admin/admin-nav";
import type { Locale } from "@/i18n/routing";
import { requireStaff } from "@/lib/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function AdminLayout({ children, params }: LayoutProps<"/[locale]/admin">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  // Second gate after the proxy; each admin action and RPC checks again.
  const viewer = await requireStaff(locale);
  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 md:grid-cols-[200px_1fr]">
      <aside>
        <AdminNav isAdmin={viewer.isAdmin} />
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
