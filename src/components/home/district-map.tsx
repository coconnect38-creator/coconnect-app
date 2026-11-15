"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { formatLKR, localName } from "@/lib/format";

/**
 * Tile cartogram of the 25 districts, roughly in geographic position (north at
 * top). Each tile is tinted by open-job count and links to the filtered listing.
 */
const LAYOUT: Record<string, [number, number]> = {
  jaffna: [1, 0], kilinochchi: [1, 1], mullaitivu: [2, 1], mannar: [0, 2], vavuniya: [1, 2], trincomalee: [2, 2],
  puttalam: [0, 3], anuradhapura: [1, 3], polonnaruwa: [2, 3], batticaloa: [3, 3], kurunegala: [1, 4], matale: [2, 4],
  ampara: [3, 4], gampaha: [0, 5], kegalle: [1, 5], kandy: [2, 5], badulla: [3, 5], colombo: [0, 6], ratnapura: [1, 6],
  "nuwara-eliya": [2, 6], monaragala: [3, 6], kalutara: [0, 7], hambantota: [3, 7], galle: [1, 8], matara: [2, 8],
};
const W = 74, H = 50, GAP = 6;
// Sequential sand → palm green ramp (5 steps).
const RAMP = ["#efe7d6", "#cfe0c8", "#9cc39a", "#5e9b68", "#1f5f3a"];

type D = { id: number; slug: string; name_en: string; name_si: string | null; name_ta: string | null; open_jobs: number; avg_daily_rate: number | null };

export function DistrictMap({ districts }: { districts: D[] }) {
  const t = useTranslations("home.map");
  const locale = useLocale() as Locale;
  const [active, setActive] = useState<D | null>(null);
  const max = Math.max(1, ...districts.map((d) => d.open_jobs));
  const tone = (n: number) => (n === 0 ? RAMP[0] : RAMP[Math.min(4, 1 + Math.floor((n / max) * 3.999))]);
  const shown = active ?? districts.reduce<D | null>((a, d) => (!a || d.open_jobs > a.open_jobs ? d : a), null);

  return (
    <div className="grid items-center gap-6 md:grid-cols-[auto_1fr]">
      <svg viewBox={`0 0 ${4 * (W + GAP)} ${9 * (H + GAP)}`} className="mx-auto w-full max-w-sm" role="list" aria-label={t("label")}>
        {districts.map((d) => {
          const pos = LAYOUT[d.slug];
          if (!pos) return null;
          const [c, r] = pos;
          const x = c * (W + GAP) + (r % 2 ? (W + GAP) / 4 : 0);
          const y = r * (H + GAP);
          const dark = d.open_jobs > 0 && tone(d.open_jobs) !== RAMP[1];
          const name = localName(d, locale);
          return (
            <g key={d.id} role="listitem">
              <Link href={{ pathname: "/jobs", query: { district: String(d.id) } }} aria-label={t("tile", { name, count: d.open_jobs })}>
                <g
                  onMouseEnter={() => setActive(d)}
                  onFocus={() => setActive(d)}
                  onTouchStart={() => setActive(d)}
                  className="cursor-pointer transition-opacity hover:opacity-85"
                >
                  <rect x={x} y={y} width={W} height={H} rx={10} fill={tone(d.open_jobs)} stroke={active?.id === d.id ? "#a35a27" : "transparent"} strokeWidth={3} />
                  <text aria-hidden="true" x={x + W / 2} y={y + 21} textAnchor="middle" fontSize={name.length > 10 ? 9 : 11} fontWeight={600} fill={dark ? "#fff" : "#1b1b18"}>
                    {name.length > 13 ? name.slice(0, 12) + "…" : name}
                  </text>
                  <text aria-hidden="true" x={x + W / 2} y={y + 38} textAnchor="middle" fontSize={13} fontWeight={700} fill={dark ? "#fff" : "#1f5f3a"}>
                    {d.open_jobs}
                  </text>
                </g>
              </Link>
            </g>
          );
        })}
      </svg>
      <div className="space-y-3" aria-live="polite">
        {shown ? (
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-sm font-semibold text-muted-foreground">{t("district")}</p>
            <p className="text-2xl font-bold">{localName(shown, locale)}</p>
            <p className="mt-2 text-lg">{t("openJobs", { count: shown.open_jobs })}</p>
            <p className="text-muted-foreground">{shown.avg_daily_rate ? t("avgRate", { rate: formatLKR(shown.avg_daily_rate) }) : t("noRate")}</p>
            <Link href={{ pathname: "/jobs", query: { district: String(shown.id) } }} className="mt-3 inline-block font-semibold text-primary underline">
              {t("see", { name: localName(shown, locale) })}
            </Link>
          </div>
        ) : null}
        <div className="flex items-center gap-2 text-xs text-muted-foreground" aria-hidden>
          <span>{t("fewer")}</span>
          {RAMP.map((c) => <span key={c} className="h-3 w-6 rounded" style={{ background: c }} />)}
          <span>{t("more")}</span>
        </div>
      </div>
    </div>
  );
}
