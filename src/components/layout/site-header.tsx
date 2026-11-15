import { Bell } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { LanguageSwitcher } from "./language-switcher";
import { UserMenu } from "./user-menu";
import { Logo } from "./logo";

export async function SiteHeader({ locale }: { locale: Locale }) {
  const t = await getTranslations("nav");
  const viewer = await getViewer();
  let unread = 0;
  if (viewer) {
    const supabase = await createClient();
    const { count } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .is("read_at", null);
    unread = count ?? 0;
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-primary" aria-label="CoConnect">
          <Logo />
        </Link>
        <nav className="ml-4 hidden items-center gap-1 md:flex">
          <Link href="/jobs" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            {t("findWork")}
          </Link>
          <Link href="/jobs/new" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            {t("postJob")}
          </Link>
          {viewer?.isStaff ? (
            <Link href="/admin" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              {t("admin")}
            </Link>
          ) : null}
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <LanguageSwitcher current={locale} />
          {viewer ? (
            <>
              <Link
                href="/dashboard/notifications"
                className={buttonVariants({ variant: "ghost", size: "icon", className: "relative" })}
                aria-label={t("notifications", { count: unread })}
              >
                <Bell className="size-5" aria-hidden />
                {unread > 0 ? (
                  <span className="absolute top-2 right-2 min-w-5 rounded-full bg-clay px-1 text-center text-xs font-bold text-white">
                    {unread > 9 ? "9+" : unread}
                  </span>
                ) : null}
              </Link>
              <UserMenu name={viewer.profile.full_name} isStaff={viewer.isStaff} />
            </>
          ) : (
            <>
              <Link href="/login" className={buttonVariants({ variant: "ghost", size: "sm", className: "px-2 sm:px-3" })}>
                {t("login")}
              </Link>
              <Link href="/register" className={buttonVariants({ size: "sm", className: "hidden sm:inline-flex" })}>
                {t("register")}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
