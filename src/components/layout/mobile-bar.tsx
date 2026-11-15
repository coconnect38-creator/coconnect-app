import { Briefcase, Search } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";

// Sinhala/Tamil labels are long: let them wrap inside the cell instead of widening the page.
const cell = "min-w-0 px-3 leading-tight";
const label = "min-w-0 text-center break-words";

/** Sticky bottom bar on mobile — where most conversion happens. */
export async function MobileBar() {
  const t = await getTranslations("nav");
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-2 gap-2 border-t border-border bg-background/95 p-2 backdrop-blur md:hidden">
      <Link href="/jobs/new" className={buttonVariants({ variant: "clay", className: cell })}>
        <Briefcase className="size-5 shrink-0" aria-hidden /> <span className={label}>{t("postJob")}</span>
      </Link>
      <Link href="/jobs" className={buttonVariants({ className: cell })}>
        <Search className="size-5 shrink-0" aria-hidden /> <span className={label}>{t("findWork")}</span>
      </Link>
    </div>
  );
}
