import { ChevronDown } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { signOut } from "@/actions/auth";

/** Disclosure menu built on <details>: works without JavaScript. */
export async function UserMenu({ name, isStaff }: { name: string; isStaff: boolean }) {
  const t = await getTranslations("nav");
  const item = "block min-h-11 rounded-md px-3 py-2.5 text-sm hover:bg-muted";
  return (
    <details className="group relative">
      <summary className="flex min-h-10 cursor-pointer list-none items-center gap-1 rounded-lg px-2 text-sm font-semibold hover:bg-muted [&::-webkit-details-marker]:hidden">
        <span className="flex size-8 items-center justify-center rounded-full bg-sand text-primary">
          {name.slice(0, 1).toUpperCase()}
        </span>
        <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <div className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-card p-1 shadow-lg">
        <p className="truncate px-3 py-2 text-xs text-muted-foreground">{name}</p>
        <Link href="/dashboard" className={item}>{t("dashboard")}</Link>
        <Link href="/dashboard/my-jobs" className={item}>{t("myJobs")}</Link>
        <Link href="/dashboard/my-bids" className={item}>{t("myBids")}</Link>
        <Link href="/dashboard/settings" className={item}>{t("settings")}</Link>
        {isStaff ? <Link href="/admin" className={item}>{t("admin")}</Link> : null}
        <form action={signOut}>
          <button type="submit" className={`${item} w-full text-left text-danger`}>
            {t("logout")}
          </button>
        </form>
      </div>
    </details>
  );
}
