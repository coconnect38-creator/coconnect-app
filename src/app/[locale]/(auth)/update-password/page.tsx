import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { NewPasswordForm } from "@/components/auth/reset-forms";
import type { Locale } from "@/i18n/routing";
import { requireViewer } from "@/lib/auth";

export default async function UpdatePasswordPage({ params }: PageProps<"/[locale]/update-password">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  await requireViewer(locale, "/update-password");
  const t = await getTranslations("auth");
  return (
    <AuthShell title={t("newPasswordTitle")}>
      <NewPasswordForm />
    </AuthShell>
  );
}
