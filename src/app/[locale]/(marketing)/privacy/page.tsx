import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Alert } from "@/components/ui/card";
import type { Locale } from "@/i18n/routing";

const SECTIONS = ["collect", "use", "share", "phone", "retention", "rights", "security", "contact"] as const;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legal.privacy");
  return { title: t("title") };
}

export default async function LegalPage({ params }: PageProps<"/[locale]/privacy">) {
  setRequestLocale((await params).locale as Locale);
  const t = await getTranslations("legal");
  return (
    <article className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <h1 className="text-3xl font-bold">{t("privacy.title")}</h1>
      <Alert tone="info">{t("draftNotice")}</Alert>
      {SECTIONS.map((s) => (
        <section key={s} className="space-y-2">
          <h2 className="text-xl font-bold">{t(`privacy.${s}.h`)}</h2>
          <p className="text-muted-foreground">{t(`privacy.${s}.p`)}</p>
        </section>
      ))}
    </article>
  );
}
