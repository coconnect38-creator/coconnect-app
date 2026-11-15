import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Alert } from "@/components/ui/card";
import type { Locale } from "@/i18n/routing";

const SECTIONS = ["intermediary", "accounts", "posting", "bidding", "conduct", "fees", "liability", "changes"] as const;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legal.terms");
  return { title: t("title") };
}

export default async function LegalPage({ params }: PageProps<"/[locale]/terms">) {
  setRequestLocale((await params).locale as Locale);
  const t = await getTranslations("legal");
  return (
    <article className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <h1 className="text-3xl font-bold">{t("terms.title")}</h1>
      <Alert tone="info">{t("draftNotice")}</Alert>
      {SECTIONS.map((s) => (
        <section key={s} className="space-y-2">
          <h2 className="text-xl font-bold">{t(`terms.${s}.h`)}</h2>
          <p className="text-muted-foreground">{t(`terms.${s}.p`)}</p>
        </section>
      ))}
    </article>
  );
}
