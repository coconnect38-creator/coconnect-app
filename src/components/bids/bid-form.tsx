"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState, useTransition } from "react";
import { placeBid, withdrawBid } from "@/actions/bids";
import { FormError, SubmitButton, useErrorText, useFieldError } from "@/components/forms/form-bits";
import { Button } from "@/components/ui/button";
import { Alert, Badge } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { detectContactInfo } from "@/lib/contact-detect";
import { formatLKR } from "@/lib/format";
import { bidTone, type BidStatus } from "@/lib/jobs";

type RateUnit = "per_worker_per_day" | "per_day" | "per_project";
export type MyBid = {
  id: string;
  rate: number;
  rate_unit: RateUnit;
  workers_offered: number;
  days_offered: number | null;
  message: string | null;
  can_start_on: string | null;
  status: BidStatus;
  total_amount: number | null;
};

function total(rate: number, unit: RateUnit, workers: number, days: number | null) {
  if (!rate) return 0;
  if (unit === "per_project") return rate;
  if (unit === "per_day") return rate * (days || 1);
  return rate * (workers || 1) * (days || 1);
}

export function BidForm({
  jobId,
  jobRateUnit,
  jobDays,
  isBroker,
  existing,
}: {
  jobId: string;
  jobRateUnit: RateUnit;
  jobDays: number | null;
  isBroker: boolean;
  existing: MyBid | null;
}) {
  const t = useTranslations("bid");
  const tu = useTranslations("rateUnit");
  const ts = useTranslations("bidStatus");
  const errorText = useErrorText();
  const [state, action] = useActionState(placeBid, null);
  const err = useFieldError(state);
  const [rate, setRate] = useState(existing?.rate ?? 0);
  const [unit, setUnit] = useState<RateUnit>(existing?.rate_unit ?? jobRateUnit);
  const [workers, setWorkers] = useState(existing?.workers_offered ?? 1);
  const [days, setDays] = useState<number | null>(existing?.days_offered ?? jobDays);
  const [message, setMessage] = useState(existing?.message ?? "");
  const [editing, setEditing] = useState(!existing || existing.status === "withdrawn");
  const [pending, start] = useTransition();
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const flags = detectContactInfo(message);

  // After a successful save the page revalidates with the new bid; show it.
  const [seen, setSeen] = useState(state);
  if (state !== seen) {
    setSeen(state);
    if (state?.ok) setEditing(false);
  }

  if (existing && !editing) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="font-semibold">{t("yourBid")}</p>
          <Badge tone={bidTone[existing.status]}>{ts(existing.status)}</Badge>
        </div>
        <p className="text-2xl font-bold text-primary">
          {formatLKR(existing.rate)} <span className="text-sm font-medium text-muted-foreground">{tu(existing.rate_unit)}</span>
        </p>
        <p className="text-sm text-muted-foreground">
          {t("summary", { workers: existing.workers_offered, days: existing.days_offered ?? "—", total: formatLKR(existing.total_amount) })}
        </p>
        {existing.message ? <p className="rounded-lg bg-muted p-3 text-sm whitespace-pre-line">{existing.message}</p> : null}
        {existing.status === "pending" || existing.status === "shortlisted" ? (
          <div className="flex gap-2">
            {existing.status === "pending" ? (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>{t("edit")}</Button>
            ) : null}
            <Button
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => {
                if (!confirm(t("withdrawConfirm"))) return;
                start(async () => {
                  const res = await withdrawBid(existing.id);
                  setWithdrawError(res.ok ? null : errorText(res.error));
                });
              }}
            >
              {t("withdraw")}
            </Button>
          </div>
        ) : null}
        {existing.status === "shortlisted" ? <p className="text-sm text-muted-foreground">{t("shortlistedNote")}</p> : null}
        {withdrawError ? <Alert tone="danger">{withdrawError}</Alert> : null}
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="job_id" value={jobId} />
      <p className="font-semibold">{existing?.status === "withdrawn" ? t("rebidTitle") : existing ? t("editTitle") : t("title")}</p>
      <FormError state={state} />
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("rate")} htmlFor="rate" error={err("rate")}>
          <Input id="rate" name="rate" type="number" inputMode="decimal" min={1} step="0.01" required defaultValue={existing?.rate ?? ""} onChange={(e) => setRate(Number(e.target.value))} />
        </Field>
        <Field label={t("unit")} htmlFor="rate_unit">
          <Select id="rate_unit" name="rate_unit" value={unit} onChange={(e) => setUnit(e.target.value as RateUnit)}>
            {(["per_worker_per_day", "per_day", "per_project"] as const).map((u) => (
              <option key={u} value={u}>{tu(u)}</option>
            ))}
          </Select>
        </Field>
        {isBroker ? (
          <Field label={t("workers")} htmlFor="workers_offered" error={err("workers_offered")}>
            <Input id="workers_offered" name="workers_offered" type="number" inputMode="numeric" min={1} max={1000} defaultValue={workers} onChange={(e) => setWorkers(Number(e.target.value) || 1)} />
          </Field>
        ) : (
          <input type="hidden" name="workers_offered" value="1" />
        )}
        <Field label={t("days")} htmlFor="days_offered" error={err("days_offered")}>
          <Input id="days_offered" name="days_offered" type="number" inputMode="numeric" min={1} max={365} defaultValue={days ?? ""} onChange={(e) => setDays(Number(e.target.value) || null)} />
        </Field>
      </div>
      <Field label={t("canStart")} htmlFor="can_start_on" error={err("can_start_on")}>
        <Input id="can_start_on" name="can_start_on" type="date" defaultValue={existing?.can_start_on ?? ""} />
      </Field>
      <Field label={t("message")} htmlFor="message" hint={t("messageHint")} error={err("message")}>
        <Textarea id="message" name="message" maxLength={1000} rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />
      </Field>
      {flags.length ? <Alert>{t("contactWarning")}</Alert> : null}
      {!isBroker ? <p className="text-xs text-muted-foreground">{t("crewHint")}</p> : null}
      <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
        <span className="text-sm font-semibold">{t("total")}</span>
        <span className="text-lg font-bold">{formatLKR(total(rate, unit, workers, days))}</span>
      </div>
      <div className="flex gap-2">
        <SubmitButton className="flex-1">{existing && existing.status !== "withdrawn" ? t("update") : t("submit")}</SubmitButton>
        {existing && existing.status !== "withdrawn" ? (
          <Button type="button" variant="ghost" onClick={() => setEditing(false)}>{t("cancelEdit")}</Button>
        ) : null}
      </div>
    </form>
  );
}
