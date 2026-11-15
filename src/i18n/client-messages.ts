import type { AbstractIntlMessages } from "next-intl";

/**
 * Only these namespaces are serialised to the browser (every page embeds them).
 * Server Components read the full catalogue directly. If a "use client"
 * component calls useTranslations("x"), "x" must be listed here —
 * `npm run i18n:check` enforces it.
 */
export const CLIENT_NAMESPACES = [
  "common", "errors", "validation", "nav", "location", "settings", "roles", "auth", "rateUnit", "bidStatus",
  "bid", "award", "review", "qa", "report", "manage", "payment", "notificationsPage", "jobForm", "jobDetail",
  "home.map", "home.how", "home.calc", "dashboard.nav",
  "admin.common", "admin.nav", "admin.settings", "admin.categories", "admin.ads",
] as const;

export function pickClientMessages(all: AbstractIntlMessages): AbstractIntlMessages {
  const out: Record<string, AbstractIntlMessages> = {};
  for (const ns of CLIENT_NAMESPACES) {
    const [head, sub] = ns.split(".");
    const value = all[head];
    if (!value || typeof value === "string") continue;
    if (!sub) out[head] = value;
    else if (typeof value[sub] === "object") out[head] = { ...(out[head] ?? {}), [sub]: value[sub] } as AbstractIntlMessages;
  }
  return out;
}
