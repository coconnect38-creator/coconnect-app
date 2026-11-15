"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", key: "overview" },
  { href: "/dashboard/my-jobs", key: "myJobs" },
  { href: "/dashboard/my-bids", key: "myBids" },
  { href: "/dashboard/notifications", key: "notifications" },
  { href: "/dashboard/settings", key: "settings" },
] as const;

export function DashboardNav() {
  const t = useTranslations("dashboard.nav");
  const pathname = usePathname();
  return (
    <nav className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-2 md:mx-0 md:flex-col md:px-0" aria-label={t("label")}>
      {items.map((it) => {
        const active = it.href === "/dashboard" ? pathname === it.href : pathname.startsWith(it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-11 shrink-0 items-center rounded-lg px-3 text-sm font-semibold whitespace-nowrap",
              active ? "bg-primary text-primary-foreground" : "hover:bg-muted",
            )}
          >
            {t(it.key)}
          </Link>
        );
      })}
    </nav>
  );
}
