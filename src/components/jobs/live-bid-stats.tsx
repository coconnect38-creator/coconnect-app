"use client";

import { Gavel, TrendingDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { formatLKR } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";

/** Public bid summary — count and lowest rate only, never identities. Live via Realtime. */
export function LiveBidStats({ jobId, initialCount, initialLowest, unitLabel }: { jobId: string; initialCount: number; initialLowest: number | null; unitLabel: string }) {
  const t = useTranslations("jobDetail");
  const [count, setCount] = useState(initialCount);
  const [lowest, setLowest] = useState(initialLowest);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`job-${jobId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "jobs", filter: `id=eq.${jobId}` }, (payload) => {
        const row = payload.new as { bid_count?: number; lowest_rate?: number | null };
        if (typeof row.bid_count === "number") setCount(row.bid_count);
        if (row.lowest_rate !== undefined) setLowest(row.lowest_rate);
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [jobId]);

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-lg bg-muted p-3">
        <p className="flex items-center gap-1 text-xs font-semibold text-muted-foreground"><Gavel className="size-4" aria-hidden /> {t("bidCount")}</p>
        <p className="text-2xl font-bold" aria-live="polite">{count}</p>
      </div>
      <div className="rounded-lg bg-muted p-3">
        <p className="flex items-center gap-1 text-xs font-semibold text-muted-foreground"><TrendingDown className="size-4" aria-hidden /> {t("lowestBid")}</p>
        <p className="text-2xl font-bold" aria-live="polite">{lowest ? formatLKR(lowest) : "—"}</p>
        {lowest ? <p className="text-xs text-muted-foreground">{unitLabel}</p> : null}
      </div>
    </div>
  );
}
