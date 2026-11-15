import { getTranslations, setRequestLocale } from "next-intl/server";
import { userAction } from "@/actions/admin";
import { ActionButton } from "@/components/admin/action-button";
import { Button } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { requireAdmin } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

const GRANTABLE = ["publisher", "worker", "broker", "moderator"] as const;

export default async function AdminUsersPage({ params, searchParams }: PageProps<"/[locale]/admin/users">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const viewer = await requireAdmin(locale);
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 80) : "";
  const supabase = await createClient();
  const { data: users } = await supabase.rpc("admin_search_users", { p_query: q, p_limit: 50 });
  const [t, tr] = await Promise.all([getTranslations("admin.users"), getTranslations("roles")]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <form method="get" className="flex gap-2">
        <Input name="q" defaultValue={q} placeholder={t("search")} aria-label={t("search")} className="max-w-md" />
        <Button type="submit" variant="outline">{t("searchBtn")}</Button>
      </form>
      <ul className="space-y-3">
        {users?.map((u) => (
          <li key={u.id}>
            <Card className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link href={`/profile/${u.id}`} className="font-bold hover:underline">{u.full_name}</Link>
                  <p className="text-sm break-all text-muted-foreground">{u.email} · {u.phone ?? t("noPhone")} {u.phone ? (u.phone_verified ? `(${t("verified")})` : `(${t("unverified")})`) : ""}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("stats", { joined: formatDate(u.created_at, locale), posted: u.jobs_posted, completed: u.jobs_completed, rating: Number(u.rating_avg).toFixed(1), reviews: u.rating_count, cancels: u.cancelled_awards })}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {u.roles.map((r) => <Badge key={r} tone={r === "admin" || r === "moderator" ? "clay" : "neutral"}>{tr(r)}</Badge>)}
                  {u.is_suspended ? <Badge tone="danger">{t("suspended")}</Badge> : null}
                  {u.broker_verified ? <Badge tone="green">{t("brokerVerified")}</Badge> : null}
                </div>
              </div>
              {u.is_suspended && u.suspended_reason ? <p className="text-sm text-danger">{u.suspended_reason}</p> : null}
              {u.id !== viewer.id ? (
                <div className="flex flex-wrap items-start gap-2 border-t border-border pt-3">
                  {GRANTABLE.map((r) =>
                    u.roles.includes(r) ? (
                      <ActionButton key={r} action={userAction.bind(null, u.id, "revoke", r)} label={t("revoke", { role: tr(r) })} variant="ghost" confirmText={t("confirmRole")} />
                    ) : (
                      <ActionButton key={r} action={userAction.bind(null, u.id, "grant", r)} label={t("grant", { role: tr(r) })} confirmText={t("confirmRole")} />
                    ),
                  )}
                  {u.is_broker ? (
                    <ActionButton action={userAction.bind(null, u.id, u.broker_verified ? "unverifyBroker" : "verifyBroker")} label={u.broker_verified ? t("unverifyBroker") : t("verifyBroker")} />
                  ) : null}
                  {u.is_suspended ? (
                    <ActionButton action={userAction.bind(null, u.id, "unsuspend")} label={t("unsuspend")} />
                  ) : (
                    <ActionButton action={userAction.bind(null, u.id, "suspend")} label={t("suspend")} reason={t("suspendReason")} variant="danger" />
                  )}
                </div>
              ) : null}
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
