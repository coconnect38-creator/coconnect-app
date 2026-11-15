import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { Alert } from "@/components/ui/card";
import { Link, redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getViewer } from "@/lib/auth";
import { safeNext } from "@/lib/site";

export async function generateMetadata({ params }: PageProps<"/[locale]/login">): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale as Locale, namespace: "auth" });
  return { title: t("loginTitle"), robots: { index: false } };
}

export default async function LoginPage({ params, searchParams }: PageProps<"/[locale]/login">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? safeNext(sp.next, "") : "";
  if (await getViewer()) redirect({ href: next ? next.replace(/^\/(en|si|ta)/, "") || "/dashboard" : "/dashboard", locale });
  const t = await getTranslations("auth");
  return (
    <AuthShell
      title={t("loginTitle")}
      subtitle={t("loginSubtitle")}
      footer={
        <>
          {t("noAccount")}{" "}
          <Link href="/register" className="font-semibold text-primary hover:underline">
            {t("registerLink")}
          </Link>
        </>
      }
    >
      {sp.error === "link" ? <Alert tone="danger">{t("linkExpired")}</Alert> : null}
      <LoginForm next={next || undefined} />
    </AuthShell>
  );
}
