"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
import { getRateStats } from "@/actions/stats";
import { buttonVariants } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { formatLKR, localName } from "@/lib/format";

type Cat = { id: number; parent_id: number | null; name_en: string; name_si: string | null; name_ta: string | null };
type Stats = Awaited<ReturnType<typeof getRateStats>>;

export function RateCalculator({ categories, fallbackRate }: { categories: Cat[]; fallbackRate: number | null }) {
  const t = useTranslations("home.calc");
  const locale = useLocale() as Locale;
  const leaves = categories.filter((c) => c.parent_id !== null || !categories.some((x) => x.parent_id === c.id));
  const [category, setCategory] = useState(leaves[0]?.id ?? 0);
  const [workers, setWorkers] = useState(4);
  const [days, setDays] = useState(2);
  const [stats, setStats] = useState<Stats>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!category) return;
    start(async () => setStats(await getRateStats(category)));
  }, [category]);

  const avg = stats?.bid_avg ?? stats?.job_avg ?? fallbackRate;
  const source = stats?.bid_avg ? "bids" : stats?.job_avg ? "jobs" : fallbackRate ? "all" : "none";
  const total = avg ? avg * workers * days : null;

  return (
    <div className="grid gap-6 rounded-2xl border border-border bg-card p-5 sm:p-8 md:grid-cols-2">
      <div className="space-y-4">
        <Field label={t("category")} htmlFor="calc-cat">
          <Select id="calc-cat" value={category} onChange={(e) => setCategory(Number(e.target.value))}>
            {leaves.map((c) => <option key={c.id} value={c.id}>{localName(c, locale)}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("workers")} htmlFor="calc-w">
            <Input id="calc-w" type="number" inputMode="numeric" min={1} max={200} value={workers} onChange={(e) => setWorkers(Math.max(1, Number(e.target.value) || 1))} />
          </Field>
          <Field label={t("days")} htmlFor="calc-d">
            <Input id="calc-d" type="number" inputMode="numeric" min={1} max={90} value={days} onChange={(e) => setDays(Math.max(1, Number(e.target.value) || 1))} />
          </Field>
        </div>
      </div>
      <div className="flex flex-col justify-between gap-4 rounded-xl bg-muted p-5" aria-live="polite" aria-busy={pending}>
        {avg ? (
          <div className="space-y-1">
            <p className="text-sm font-semibold text-muted-foreground">{t("typical")}</p>
            <p className="text-3xl font-bold text-primary">{formatLKR(avg)} <span className="text-base font-medium text-muted-foreground">{t("perWorkerDay")}</span></p>
            {stats?.bid_low && stats.bid_high ? <p className="text-sm">{t("range", { low: formatLKR(stats.bid_low), high: formatLKR(stats.bid_high) })}</p> : null}
            <p className="pt-2 text-lg">{t("total", { total: formatLKR(total) })}</p>
            <p className="text-xs text-muted-foreground">{t(`source.${source}`, { count: Number(stats?.bid_samples ?? stats?.job_samples ?? 0) })}</p>
          </div>
        ) : (
          <p className="text-muted-foreground">{t("noData")}</p>
        )}
        <Link
          href={{ pathname: "/jobs/new", query: { category: String(category), workers: String(workers), days: String(days), ...(avg ? { rate: String(Math.round(avg)) } : {}) } }}
          className={buttonVariants({ variant: "clay" })}
        >
          {avg ? t("postAt", { rate: formatLKR(avg) }) : t("post")}
        </Link>
      </div>
    </div>
  );
}
