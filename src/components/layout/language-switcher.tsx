"use client";

import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

const labels: Record<Locale, string> = { en: "English", si: "සිංහල", ta: "தமிழ்" };

export function LanguageSwitcher({ current }: { current: Locale }) {
  const t = useTranslations("nav");
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();

  return (
    <label className="relative">
      <span className="sr-only">{t("language")}</span>
      <select
        value={current}
        disabled={pending}
        onChange={(e) => {
          const locale = e.target.value as Locale;
          // Read the query at switch time (useSearchParams would opt static pages out of prerendering).
          const qs = window.location.search;
          start(() => router.replace(`${pathname}${qs}`, { locale }));
        }}
        // System font for the native-script labels: otherwise every English page
        // downloads the Sinhala and Tamil web fonts (~180 KB) just for this menu.
        className="min-h-10 cursor-pointer rounded-lg border border-border bg-card px-2 font-ui text-sm font-semibold"
      >
        {routing.locales.map((l) => (
          <option key={l} value={l}>
            {labels[l]}
          </option>
        ))}
      </select>
    </label>
  );
}
