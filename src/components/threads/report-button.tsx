"use client";

import { Flag } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { submitReport } from "@/actions/social";
import { FormError, SubmitButton } from "@/components/forms/form-bits";
import { Select, Textarea } from "@/components/ui/input";

const REASONS = ["spam", "scam", "contact_info", "offensive", "wrong_category", "other"] as const;

export function ReportButton({ targetType, targetId }: { targetType: "job" | "profile" | "thread" | "review"; targetId: string }) {
  const t = useTranslations("report");
  const [state, action] = useActionState(submitReport, null);
  return (
    <details className="group relative inline-block">
      <summary className="inline-flex min-h-9 cursor-pointer list-none items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-danger [&::-webkit-details-marker]:hidden">
        <Flag className="size-3.5" aria-hidden /> {t("button")}
      </summary>
      <div className="absolute right-0 z-20 mt-1 w-72 rounded-xl border border-border bg-card p-3 shadow-lg">
        {state?.ok ? (
          <p className="text-sm">{t("thanks")}</p>
        ) : (
          <form action={action} className="space-y-2">
            <input type="hidden" name="target_type" value={targetType} />
            <input type="hidden" name="target_id" value={targetId} />
            <label htmlFor={`rr-${targetId}`} className="text-sm font-semibold">{t("why")}</label>
            <Select id={`rr-${targetId}`} name="reason" required defaultValue="">
              <option value="" disabled>{t("choose")}</option>
              {REASONS.map((r) => (
                <option key={r} value={r}>{t(`reasons.${r}`)}</option>
              ))}
            </Select>
            <Textarea name="details" rows={2} maxLength={1000} placeholder={t("details")} aria-label={t("details")} />
            <FormError state={state} />
            <SubmitButton size="sm" variant="danger">{t("send")}</SubmitButton>
          </form>
        )}
      </div>
    </details>
  );
}
