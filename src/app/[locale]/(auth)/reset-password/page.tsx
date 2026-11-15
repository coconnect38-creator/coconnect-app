import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { RequestResetForm } from "@/components/auth/reset-forms";
import type { Locale } from "@/i18n/routing";

export default async function ResetPasswordPage({ params }: PageProps<"/[locale]/reset-password">) {
  setRequestLocale((await params).locale as Locale);
  const t = await getTranslations("auth");
  return (
    <AuthShell title={t("resetTitle")} subtitle={t("resetSubtitle")}>
      <RequestResetForm />
    </AuthShell>
  );
}
