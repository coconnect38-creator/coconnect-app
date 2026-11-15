"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/admin", key: "dashboard", admin: false },
  { href: "/admin/moderation", key: "moderation", admin: false },
  { href: "/admin/jobs", key: "jobs", admin: false },
  { href: "/admin/reports", key: "reports", admin: false },
  { href: "/admin/users", key: "users", admin: true },
  { href: "/admin/payments", key: "payments", admin: true },
  { href: "/admin/categories", key: "categories", admin: true },
  { href: "/admin/ads", key: "ads", admin: true },
  { href: "/admin/settings", key: "settings", admin: true },
  { href: "/admin/audit", key: "audit", admin: true },
] as const;

export function AdminNav({ isAdmin }: { isAdmin: boolean }) {
  const t = useTranslations("admin.nav");
  const pathname = usePathname();
  return (
    <nav className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-2 md:mx-0 md:flex-col md:px-0" aria-label={t("label")}>
      {ITEMS.filter((i) => isAdmin || !i.admin).map((it) => {
        const active = it.href === "/admin" ? pathname === it.href : pathname.startsWith(it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={active ? "page" : undefined}
            className={cn("flex min-h-11 shrink-0 items-center rounded-lg px-3 text-sm font-semibold whitespace-nowrap", active ? "bg-foreground text-background" : "hover:bg-muted")}
          >
            {t(it.key)}
          </Link>
        );
      })}
    </nav>
  );
}
