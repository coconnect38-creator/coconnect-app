"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { awardBid } from "@/actions/awards";
import { setShortlisted } from "@/actions/bids";
import { useErrorText } from "@/components/forms/form-bits";
import { Button } from "@/components/ui/button";

export function BidRowActions({ bidId, status, bidderName }: { bidId: string; status: string; bidderName: string }) {
  const t = useTranslations("manage");
  const errorText = useErrorText();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  if (status !== "pending" && status !== "shortlisted") return null;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap gap-1.5">
        <Button
          size="sm"
          disabled={pending}
          onClick={() => {
            if (!confirm(t("awardConfirm", { name: bidderName }))) return;
            start(async () => {
              const r = await awardBid(bidId);
              setError(r.ok ? null : errorText(r.error));
            });
          }}
        >
          {t("award")}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await setShortlisted(bidId, status === "pending");
              setError(r.ok ? null : errorText(r.error));
            })
          }
        >
          {status === "pending" ? t("shortlist") : t("unshortlist")}
        </Button>
      </div>
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}
