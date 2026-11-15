import { getTranslations, setRequestLocale } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Locale } from "@/i18n/routing";
import { requireAdmin } from "@/lib/auth";
import { getPublicProfiles } from "@/lib/data/jobs";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export default async function AdminAuditPage({ params, searchParams }: PageProps<"/[locale]/admin/audit">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  await requireAdmin(locale);
  const sp = await searchParams;
  const action = typeof sp.action === "string" ? sp.action.trim().slice(0, 60) : "";
  const actor = typeof sp.actor === "string" && /^[0-9a-f-]{36}$/i.test(sp.actor) ? sp.actor : "";
  const supabase = await createClient();
  let q = supabase.from("admin_actions").select("*").order("created_at", { ascending: false }).limit(200);
  if (action) q = q.ilike("action", `${action.replace(/[\\%_]/g, (m) => `\\${m}`)}%`);
  if (actor) q = q.eq("actor_id", actor);
  const { data: rows } = await q;
  const actors = await getPublicProfiles((rows ?? []).map((r) => r.actor_id).filter((x): x is string => !!x));
  const t = await getTranslations("admin.audit");
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <form method="get" className="flex flex-wrap gap-2">
        <Input name="action" defaultValue={action} placeholder={t("action")} aria-label={t("action")} className="max-w-48" />
        <Input name="actor" defaultValue={actor} placeholder={t("actor")} aria-label={t("actor")} className="max-w-sm" />
        <Button type="submit" variant="outline">{t("filter")}</Button>
      </form>
      <Card className="overflow-x-auto p-0 sm:p-0">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-border bg-muted text-xs uppercase">
            <tr><th className="p-3">{t("when")}</th><th className="p-3">{t("actor")}</th><th className="p-3">{t("action")}</th><th className="p-3">{t("target")}</th><th className="p-3">{t("details")}</th></tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows?.map((r) => (
              <tr key={r.id} className="align-top">
                <td className="p-3 whitespace-nowrap">{formatDateTime(r.created_at, locale)}</td>
                <td className="p-3">{r.actor_id ? (actors.get(r.actor_id)?.full_name ?? r.actor_id.slice(0, 8)) : t("system")}</td>
                <td className="p-3 font-mono">{r.action}</td>
                <td className="p-3 font-mono text-xs">{r.target_type} {r.target_id?.slice(0, 8)}</td>
                <td className="max-w-xs p-3 font-mono text-xs break-all">{r.meta ? JSON.stringify(r.meta).slice(0, 200) : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
