"use client";

import { ClipboardList, Gavel, Handshake, PhoneCall, Search, Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { cn } from "@/lib/utils";

const TRACKS = {
  hire: [ClipboardList, Gavel, PhoneCall],
  work: [Search, Handshake, Star],
} as const;

export function HowItWorks() {
  const t = useTranslations("home.how");
  const [track, setTrack] = useState<"hire" | "work">("hire");
  return (
    <div className="space-y-6">
      <div role="tablist" aria-label={t("label")} className="mx-auto flex w-fit rounded-full bg-muted p-1">
        {(["hire", "work"] as const).map((k) => (
          <button
            key={k}
            id={`how-tab-${k}`}
            role="tab"
            aria-selected={track === k}
            aria-controls="how-panel"
            onClick={() => setTrack(k)}
            className={cn("min-h-11 rounded-full px-5 text-sm font-semibold transition-colors", track === k ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
          >
            {t(`${k}.tab`)}
          </button>
        ))}
      </div>
      <div id="how-panel" role="tabpanel" aria-labelledby={`how-tab-${track}`}>
        <ol className="grid gap-4 sm:grid-cols-3">
          {TRACKS[track].map((Icon, i) => (
            <li key={`${track}-${i}`} className="animate-rise rounded-xl border border-border bg-card p-5" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="mb-3 flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-full bg-sand font-bold text-primary">{i + 1}</span>
                <Icon className="size-6 text-clay" aria-hidden />
              </div>
              <p className="font-bold">{t(`${track}.s${(i + 1) as 1 | 2 | 3}.title`)}</p>
              <p className="text-sm text-muted-foreground">{t(`${track}.s${(i + 1) as 1 | 2 | 3}.body`)}</p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
