import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";
import { Link, redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getViewer } from "@/lib/auth";

export async function generateMetadata({ params }: PageProps<"/[locale]/register">): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale as Locale, namespace: "auth" });
  return { title: t("registerTitle") };
}

export default async function RegisterPage({ params }: PageProps<"/[locale]/register">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  if (await getViewer()) redirect({ href: "/dashboard", locale });
  const t = await getTranslations("auth");
  return (
    <AuthShell
      title={t("registerTitle")}
      subtitle={t("registerSubtitle")}
      footer={
        <>
          {t("haveAccount")}{" "}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            {t("loginLink")}
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthShell>
  );
}
