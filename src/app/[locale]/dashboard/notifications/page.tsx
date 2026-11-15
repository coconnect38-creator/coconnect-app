import { getTranslations, setRequestLocale } from "next-intl/server";
import { MarkReadButton } from "@/components/notifications/mark-read-button";
import { NotificationItem } from "@/components/notifications/notification-item";
import { Card } from "@/components/ui/card";
import type { Locale } from "@/i18n/routing";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function NotificationsPage({ params }: PageProps<"/[locale]/dashboard/notifications">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  await requireViewer(locale);
  const supabase = await createClient();
  const { data } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(100);
  const t = await getTranslations("notificationsPage");
  const unread = (data ?? []).some((n) => !n.read_at);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        {unread ? <MarkReadButton /> : null}
      </div>
      <Card className="p-2 sm:p-2">
        {data?.length ? (
          <ul className="divide-y divide-border">
            {data.map((n) => (
              <li key={n.id}>
                <NotificationItem n={n} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="p-4 text-muted-foreground">{t("empty")}</p>
        )}
      </Card>
    </div>
  );
}
