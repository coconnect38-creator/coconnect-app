"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { postThread } from "@/actions/social";
import { FormError, SubmitButton, useFieldError } from "@/components/forms/form-bits";
import { Alert } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";
import { detectContactInfo } from "@/lib/contact-detect";

export function ThreadForm({ jobId, parentId, compact = false }: { jobId: string; parentId?: string; compact?: boolean }) {
  const t = useTranslations("qa");
  const [state, action] = useActionState(postThread, null);
  const err = useFieldError(state);
  const [body, setBody] = useState("");
  const [seen, setSeen] = useState(state);
  if (state !== seen) {
    setSeen(state);
    if (state?.ok) setBody("");
  }
  const flags = detectContactInfo(body);
  const id = `body-${parentId ?? "root"}`;

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="job_id" value={jobId} />
      <input type="hidden" name="kind" value={parentId ? "comment" : "question"} />
      {parentId ? <input type="hidden" name="parent_id" value={parentId} /> : null}
      <label htmlFor={id} className={compact ? "sr-only" : "text-sm font-semibold"}>{parentId ? t("reply") : t("ask")}</label>
      <Textarea id={id} name="body" rows={compact ? 2 : 3} maxLength={1000} required value={body} onChange={(e) => setBody(e.target.value)} placeholder={parentId ? t("replyPlaceholder") : t("askPlaceholder")} />
      {err("body") ? <p className="text-sm text-danger">{err("body")}</p> : null}
      {flags.length ? <Alert>{t("contactWarning")}</Alert> : null}
      <FormError state={state} />
      <SubmitButton size="sm" variant={parentId ? "outline" : "primary"}>{parentId ? t("postReply") : t("postQuestion")}</SubmitButton>
    </form>
  );
}
