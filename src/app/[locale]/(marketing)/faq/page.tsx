import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";

const FAQ = ["free", "contact", "choose", "broker", "pay", "safety", "rejected", "multi", "complete", "delete"] as const;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("home.faq");
  return { title: t("title") };
}

export default async function FaqPage({ params }: PageProps<"/[locale]/faq">) {
  setRequestLocale((await params).locale as Locale);
  const t = await getTranslations("home.faq");
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <h1 className="text-3xl font-bold">{t("title")}</h1>
      <div className="divide-y divide-border rounded-xl border border-border bg-card">
        {FAQ.map((k) => (
          <details key={k} className="group p-4" open={k === "free"}>
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 font-semibold [&::-webkit-details-marker]:hidden">
              {t(`${k}.q`)}
              <span className="text-xl text-muted-foreground transition-transform group-open:rotate-45" aria-hidden>+</span>
            </summary>
            <p className="pt-2 text-muted-foreground">{t(`${k}.a`)}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
