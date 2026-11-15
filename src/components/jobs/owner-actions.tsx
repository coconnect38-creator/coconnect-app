"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { closeHiring } from "@/actions/awards";
import { cancelJob, deleteDraft, submitJob } from "@/actions/jobs";
import { Captcha, captchaEnabled } from "@/components/forms/captcha";
import { useErrorText } from "@/components/forms/form-bits";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";
import type { ActionResult } from "@/lib/result";

export function OwnerActions({
  jobId,
  canSubmit,
  canCancel,
  canDelete,
  canClose,
}: {
  jobId: string;
  canSubmit: boolean;
  canCancel: boolean;
  canDelete: boolean;
  canClose: boolean;
}) {
  const t = useTranslations("manage");
  const errorText = useErrorText();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [captcha, setCaptcha] = useState("");
  const [attempt, setAttempt] = useState(0);
  const run = (fn: () => Promise<ActionResult<unknown>>) =>
    start(async () => {
      const res = await fn();
      setError(res.ok ? null : errorText(res.error));
      setAttempt((n) => n + 1);
    });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {canSubmit ? (
          <Button disabled={pending || (captchaEnabled && !captcha)} onClick={() => run(() => submitJob(jobId, captcha || undefined))}>
            {t("submit")}
          </Button>
        ) : null}
        {canClose ? (
          <Button
            variant="clay"
            disabled={pending}
            onClick={() => {
              if (confirm(t("closeConfirm"))) run(() => closeHiring(jobId));
            }}
          >
            {t("closeHiring")}
          </Button>
        ) : null}
        {canDelete ? (
          <Button
            variant="ghost"
            disabled={pending}
            onClick={() => {
              if (confirm(t("deleteConfirm"))) run(() => deleteDraft(jobId));
            }}
          >
            {t("deleteDraft")}
          </Button>
        ) : null}
      </div>
      {canSubmit ? <Captcha resetKey={attempt} onToken={setCaptcha} /> : null}
      {canCancel ? (
        <details>
          <summary className="inline-flex min-h-10 cursor-pointer items-center text-sm font-semibold text-danger">{t("cancelJob")}</summary>
          <div className="mt-2 max-w-md space-y-2">
            <label htmlFor="cancel-reason" className="text-sm font-semibold">{t("cancelReason")}</label>
            <Textarea id="cancel-reason" rows={2} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
            <Button variant="danger" size="sm" disabled={pending} onClick={() => run(() => cancelJob(jobId, reason))}>
              {t("confirmCancel")}
            </Button>
          </div>
        </details>
      ) : null}
      {error ? <Alert tone="danger">{error}</Alert> : null}
    </div>
  );
}
