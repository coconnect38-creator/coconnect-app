import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { MobileBar } from "@/components/layout/mobile-bar";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { MaintenanceBanner } from "@/components/layout/maintenance-banner";
import { SentryLoader } from "@/components/layout/sentry-loader";
import { latin, sinhala, tamil } from "@/fonts";
import { pickClientMessages } from "@/i18n/client-messages";
import { routing } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
    title: { default: t("title"), template: `%s · CoConnect` },
    description: t("description"),
    alternates: { languages: Object.fromEntries(routing.locales.map((l) => [l, `/${l}`])) },
  };
}

export const viewport: Viewport = { themeColor: "#1f5f3a", width: "device-width", initialScale: 1 };

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const clientMessages = pickClientMessages(await getMessages());

  return (
    <html lang={locale} className={`${latin.variable} ${sinhala.variable} ${tamil.variable}`}>
      <body className="flex min-h-dvh flex-col antialiased">
        <NextIntlClientProvider messages={clientMessages}>
          <MaintenanceBanner />
          <SiteHeader locale={locale} />
          <main className="flex-1 pb-20 md:pb-0">{children}</main>
          <SiteFooter />
          <MobileBar />
        </NextIntlClientProvider>
        <SentryLoader />
      </body>
    </html>
  );
}
