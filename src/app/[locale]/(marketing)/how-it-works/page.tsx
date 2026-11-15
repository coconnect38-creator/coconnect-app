import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { HowItWorks } from "@/components/home/how-it-works";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("home.how");
  return { title: t("title") };
}

export default async function HowItWorksPage({ params }: PageProps<"/[locale]/how-it-works">) {
  setRequestLocale((await params).locale as Locale);
  const t = await getTranslations("home.how");
  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-10">
      <h1 className="text-center text-3xl font-bold">{t("title")}</h1>
      <HowItWorks />
      <div className="flex justify-center gap-3">
        <Link href="/jobs/new" className={buttonVariants({ variant: "clay" })}>{t("ctaHire")}</Link>
        <Link href="/jobs" className={buttonVariants()}>{t("ctaWork")}</Link>
      </div>
    </div>
  );
}
