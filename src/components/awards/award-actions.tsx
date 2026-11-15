"use client";

import { CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { cancelAward, markComplete } from "@/actions/awards";
import { useErrorText } from "@/components/forms/form-bits";
import { Button } from "@/components/ui/button";
import { Alert, Badge } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";

export type AwardState = {
  id: string;
  completion_requested_by: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
};

/** Completion handshake + cancel for one award, from either party's side. */
export function AwardActions({ award, viewerId }: { award: AwardState; viewerId: string }) {
  const t = useTranslations("award");
  const errorText = useErrorText();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  if (award.cancelled_at) return <Badge tone="neutral">{t("cancelled")}</Badge>;
  if (award.completed_at) {
    return (
      <Badge tone="green">
        <CheckCircle2 className="size-4" aria-hidden /> {t("completed")}
      </Badge>
    );
  }

  const iRequested = award.completion_requested_by === viewerId;
  const theyRequested = award.completion_requested_by && !iRequested;

  return (
    <div className="space-y-2">
      {iRequested ? <p className="text-sm text-muted-foreground">{t("waitingConfirm")}</p> : null}
      {theyRequested ? <Alert tone="info">{t("otherRequested")}</Alert> : null}
      <div className="flex flex-wrap gap-2">
        {!iRequested ? (
          <Button
            size="sm"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await markComplete(award.id);
                setError(res.ok ? null : errorText(res.error));
              })
            }
          >
            {theyRequested ? t("confirmComplete") : t("markComplete")}
          </Button>
        ) : null}
        <details className="w-full">
          <summary className="inline-flex min-h-10 cursor-pointer items-center text-sm font-semibold text-danger">{t("cancelAward")}</summary>
          <div className="mt-2 space-y-2">
            <label htmlFor={`reason-${award.id}`} className="text-sm font-semibold">{t("cancelReason")}</label>
            <Textarea id={`reason-${award.id}`} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} rows={2} />
            <Button
              size="sm"
              variant="danger"
              disabled={pending || reason.trim().length < 3}
              onClick={() =>
                start(async () => {
                  const res = await cancelAward(award.id, reason);
                  setError(res.ok ? null : errorText(res.error));
                })
              }
            >
              {t("confirmCancel")}
            </Button>
          </div>
        </details>
      </div>
      {error ? <Alert tone="danger">{error}</Alert> : null}
    </div>
  );
}
