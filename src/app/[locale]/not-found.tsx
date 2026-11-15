import { getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("common");
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <p className="text-6xl font-bold text-sand">404</p>
      <p className="mt-4 text-lg">{t("notFound")}</p>
      <Link href="/" className={buttonVariants({ className: "mt-6" })}>{t("goHome")}</Link>
    </div>
  );
}
