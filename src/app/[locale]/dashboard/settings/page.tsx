import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AvatarForm } from "@/components/profile/avatar-form";
import { PhoneSection } from "@/components/profile/phone-section";
import { ProfileForm } from "@/components/profile/profile-form";
import { RolesSection } from "@/components/profile/roles-section";
import { Alert, Card } from "@/components/ui/card";
import type { Locale } from "@/i18n/routing";
import { isProfileComplete, requireViewer } from "@/lib/auth";
import { getCities, getDistricts } from "@/lib/data/reference";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settings");
  return { title: t("title"), robots: { index: false } };
}

export default async function SettingsPage({ params, searchParams }: PageProps<"/[locale]/dashboard/settings">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const viewer = await requireViewer(locale);
  const [t, districts, cities, sp] = await Promise.all([getTranslations("settings"), getDistricts(), getCities(), searchParams]);
  const complete = isProfileComplete(viewer.profile);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      {sp.welcome ? <Alert tone="success">{t("welcome")}</Alert> : null}
      {!complete ? <Alert>{t("completeProfile")}</Alert> : null}
      <Card className="space-y-4">
        <h2 className="text-lg font-bold">{t("profile")}</h2>
        <AvatarForm name={viewer.profile.full_name} avatarUrl={viewer.profile.avatar_url} />
        <ProfileForm profile={viewer.profile} districts={districts} cities={cities} />
      </Card>
      <Card className="space-y-4">
        <h2 className="text-lg font-bold">{t("phoneTitle")}</h2>
        <PhoneSection phone={viewer.profile.phone} verified={viewer.profile.phone_verified} />
      </Card>
      <Card className="space-y-4">
        <h2 className="text-lg font-bold">{t("rolesTitle")}</h2>
        <RolesSection roles={viewer.roles} brokerVerified={viewer.profile.broker_verified} />
      </Card>
      <Card className="space-y-2">
        <h2 className="text-lg font-bold">{t("accountTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("emailIs", { email: viewer.email ?? "—" })}</p>
        <p className="text-sm text-muted-foreground">{t("deleteAccount")}</p>
      </Card>
    </div>
  );
}
