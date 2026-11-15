import { getTranslations, setRequestLocale } from "next-intl/server";
import { deleteAd } from "@/actions/admin";
import { ActionButton } from "@/components/admin/action-button";
import { AdForm } from "@/components/admin/ad-form";
import { Badge, Card } from "@/components/ui/card";
import type { Locale } from "@/i18n/routing";
import { requireAdmin } from "@/lib/auth";
import { getCategories, getDistricts } from "@/lib/data/reference";
import { createClient } from "@/lib/supabase/server";

export default async function AdminAdsPage({ params }: PageProps<"/[locale]/admin/ads">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  await requireAdmin(locale);
  const supabase = await createClient();
  const [{ data: ads }, districts, categories, t] = await Promise.all([
    supabase.from("ad_placements").select("*").order("created_at", { ascending: false }),
    getDistricts(),
    getCategories(true),
    getTranslations("admin.ads"),
  ]);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <p className="text-sm text-muted-foreground">{t("explainer")}</p>
      <ul className="space-y-2">
        {ads?.map((ad) => (
          <li key={ad.id}>
            <Card className="p-0 sm:p-0">
              <details>
                <summary className="flex min-h-12 cursor-pointer flex-wrap items-center gap-2 px-4 py-3">
                  <span className="font-semibold">{ad.title}</span>
                  <Badge>{t(`slots.${ad.slot as "home_hero"}`)}</Badge>
                  {!ad.is_active ? <Badge tone="danger">{t("inactive")}</Badge> : null}
                  <span className="ml-auto text-sm text-muted-foreground">{t("stats", { impressions: ad.impressions, clicks: ad.clicks, ctr: ad.impressions ? ((ad.clicks / ad.impressions) * 100).toFixed(1) : "0.0" })}</span>
                </summary>
                <div className="space-y-3 border-t border-border p-4">
                  <AdForm ad={ad} districts={districts} categories={categories} />
                  <ActionButton action={deleteAd.bind(null, ad.id)} label={t("delete")} variant="ghost" confirmText={t("deleteConfirm")} />
                </div>
              </details>
            </Card>
          </li>
        ))}
      </ul>
      <Card className="space-y-3">
        <h2 className="font-bold">{t("new")}</h2>
        <AdForm districts={districts} categories={categories} />
      </Card>
    </div>
  );
}
