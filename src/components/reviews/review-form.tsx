"use client";

import { Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { submitReview } from "@/actions/social";
import { FormError, SubmitButton } from "@/components/forms/form-bits";
import { Alert } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function ReviewForm({ jobId, revieweeId, revieweeName }: { jobId: string; revieweeId: string; revieweeName: string }) {
  const t = useTranslations("review");
  const [state, action] = useActionState(submitReview, null);
  const [rating, setRating] = useState(0);
  if (state?.ok) return <Alert tone="success">{t("thanks")}</Alert>;
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="job_id" value={jobId} />
      <input type="hidden" name="reviewee_id" value={revieweeId} />
      <input type="hidden" name="rating" value={rating || ""} />
      <p className="font-semibold">{t("prompt", { name: revieweeName })}</p>
      <FormError state={state} />
      <div className="flex gap-1" role="radiogroup" aria-label={t("rating")}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={rating === n}
            aria-label={t("stars", { count: n })}
            onClick={() => setRating(n)}
            className="flex size-12 items-center justify-center rounded-lg hover:bg-muted"
          >
            <Star className={cn("size-8", n <= rating ? "fill-clay text-clay" : "text-border")} aria-hidden />
          </button>
        ))}
      </div>
      <label htmlFor={`comment-${revieweeId}`} className="sr-only">{t("comment")}</label>
      <Textarea id={`comment-${revieweeId}`} name="comment" maxLength={1000} rows={3} placeholder={t("commentPlaceholder")} />
      <SubmitButton disabled={!rating}>{t("submit")}</SubmitButton>
    </form>
  );
}
