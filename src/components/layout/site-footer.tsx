import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { LanguageSwitcher } from "./language-switcher";
import { Logo } from "./logo";

export async function SiteFooter() {
  const t = await getTranslations("footer");
  const locale = (await getLocale()) as Locale;
  const link = "text-sm text-muted-foreground hover:text-foreground";
  return (
    <footer className="mt-16 border-t border-border bg-muted/50">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
        <div className="space-y-3">
          <div className="font-bold text-primary"><Logo /></div>
          <p className="text-sm text-muted-foreground">{t("tagline")}</p>
          <LanguageSwitcher current={locale} />
        </div>
        <nav className="flex flex-col gap-2" aria-label={t("product")}>
          <p className="text-sm font-semibold">{t("product")}</p>
          <Link href="/jobs" className={link}>{t("browseJobs")}</Link>
          <Link href="/jobs/new" className={link}>{t("postJob")}</Link>
          <Link href="/how-it-works" className={link}>{t("howItWorks")}</Link>
          <Link href="/faq" className={link}>{t("faq")}</Link>
        </nav>
        <nav className="flex flex-col gap-2" aria-label={t("legal")}>
          <p className="text-sm font-semibold">{t("legal")}</p>
          <Link href="/terms" className={link}>{t("terms")}</Link>
          <Link href="/privacy" className={link}>{t("privacy")}</Link>
          <p className="pt-2 text-xs text-muted-foreground">{t("intermediary")}</p>
        </nav>
      </div>
      <p className="pb-6 text-center text-xs text-muted-foreground">© {new Date().getFullYear()} CoConnect</p>
    </footer>
  );
}
