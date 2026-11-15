import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { formatRelative } from "@/lib/format";
import { notificationParams } from "@/lib/notify";
import { cn } from "@/lib/utils";

type N = { id: string; type: string; data: unknown; link: string | null; read_at: string | null; created_at: string };

export async function NotificationItem({ n }: { n: N }) {
  const t = await getTranslations("notifications");
  const locale = (await getLocale()) as Locale;
  const params = notificationParams((n.data ?? {}) as Record<string, unknown>, locale);
  // n.type comes from the database; t.has() guards unknown types at runtime.
  const k = n.type as "bid_received";
  const title = t.has(`${k}.title`) ? t(`${k}.title`, params) : n.type;
  const body = t.has(`${k}.body`) ? t(`${k}.body`, params) : "";
  const inner = (
    <div className={cn("flex gap-3 rounded-lg p-3", !n.read_at && "bg-success-bg/60")}>
      {!n.read_at ? <span className="mt-2 size-2 shrink-0 rounded-full bg-clay" aria-hidden /> : <span className="size-2 shrink-0" />}
      <div className="min-w-0">
        <p className="font-semibold">{title}</p>
        {body ? <p className="text-sm text-muted-foreground">{body}</p> : null}
        <p className="text-xs text-muted-foreground">{formatRelative(n.created_at, locale)}</p>
      </div>
    </div>
  );
  return n.link ? <Link href={n.link} className="block hover:bg-muted rounded-lg">{inner}</Link> : inner;
}
