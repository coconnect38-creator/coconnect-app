import { getTranslations, setRequestLocale } from "next-intl/server";
import { CategoryForm } from "@/components/admin/category-form";
import { Badge, Card } from "@/components/ui/card";
import type { Locale } from "@/i18n/routing";
import { requireAdmin } from "@/lib/auth";
import { getCategories, getPublicSettings } from "@/lib/data/reference";
import { formatLKR } from "@/lib/format";

export default async function AdminCategoriesPage({ params }: PageProps<"/[locale]/admin/categories">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  await requireAdmin(locale);
  const [t, categories, settings] = await Promise.all([getTranslations("admin.categories"), getCategories(true), getPublicSettings()]);
  const parents = categories.filter((c) => c.parent_id === null);
  const ordered = parents.flatMap((p) => [p, ...categories.filter((c) => c.parent_id === p.id)]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <p className="text-sm text-muted-foreground">{settings.fees_enabled ? t("feesOn") : t("feesOff")}</p>
      <ul className="space-y-2">
        {ordered.map((c) => (
          <li key={c.id} className={c.parent_id ? "ml-6" : ""}>
            <Card className="p-0 sm:p-0">
              <details>
                <summary className="flex min-h-12 cursor-pointer flex-wrap items-center gap-2 px-4 py-3">
                  <span className="font-semibold">{c.name_en}</span>
                  <span className="text-sm text-muted-foreground">{c.name_si} · {c.name_ta}</span>
                  <span className="ml-auto flex gap-1">
                    {Number(c.publish_fee_lkr) > 0 ? <Badge tone="clay">{formatLKR(c.publish_fee_lkr, { exact: true })}</Badge> : null}
                    {!c.is_active ? <Badge tone="danger">{t("inactive")}</Badge> : null}
                  </span>
                </summary>
                <div className="border-t border-border p-4">
                  <CategoryForm category={{ ...c, publish_fee_lkr: Number(c.publish_fee_lkr) }} parents={parents} />
                </div>
              </details>
            </Card>
          </li>
        ))}
      </ul>
      <Card className="space-y-3">
        <h2 className="font-bold">{t("new")}</h2>
        <CategoryForm parents={parents} />
      </Card>
    </div>
  );
}
