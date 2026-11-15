import { getTranslations, setRequestLocale } from "next-intl/server";
import { SettingsForm } from "@/components/admin/settings-form";
import type { Locale } from "@/i18n/routing";
import { requireAdmin } from "@/lib/auth";
import { getPublicSettings } from "@/lib/data/reference";

export default async function AdminSettingsPage({ params }: PageProps<"/[locale]/admin/settings">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  await requireAdmin(locale);
  const [t, settings] = await Promise.all([getTranslations("admin.settings"), getPublicSettings()]);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <SettingsForm settings={settings} />
    </div>
  );
}
