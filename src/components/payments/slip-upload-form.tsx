"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { uploadSlip } from "@/actions/payments";
import { FormError, SubmitButton, useFieldError } from "@/components/forms/form-bits";
import { Alert } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { compressImage } from "@/lib/compress-image";

export function SlipUploadForm({ jobId, reference }: { jobId: string; reference: string }) {
  const t = useTranslations("payment");
  const [state, action] = useActionState(uploadSlip, null);
  const err = useFieldError(state);
  if (state?.ok) return <Alert tone="success">{t("uploaded")}</Alert>;
  return (
    <form
      action={async (fd) => {
        const f = fd.get("slip");
        if (f instanceof File && f.type.startsWith("image/")) fd.set("slip", await compressImage(f, 2000, 0.85));
        return action(fd);
      }}
      className="space-y-3"
    >
      <input type="hidden" name="job_id" value={jobId} />
      <FormError state={state} />
      <Field label={t("slip")} htmlFor="slip" hint={t("slipHint")} error={err("slip")}>
        <Input id="slip" name="slip" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" required className="py-2" />
      </Field>
      <Field label={t("bankRef")} htmlFor="bank_ref" hint={t("bankRefHint", { ref: reference })}>
        <Input id="bank_ref" name="bank_ref" defaultValue={reference} maxLength={60} />
      </Field>
      <SubmitButton>{t("upload")}</SubmitButton>
    </form>
  );
}
