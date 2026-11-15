"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Alert } from "@/components/ui/card";
import type { ActionResult } from "@/lib/result";

export function SubmitButton({ children, pendingText, ...props }: ButtonProps & { pendingText?: ReactNode }) {
  const { pending } = useFormStatus();
  const t = useTranslations("common");
  return (
    <Button type="submit" disabled={pending || props.disabled} aria-busy={pending} {...props}>
      {pending ? (pendingText ?? t("working")) : children}
    </Button>
  );
}

/** Translate an action error code (errors.*), falling back to a generic message. */
export function useErrorText() {
  const t = useTranslations("errors");
  return (code: string | undefined | null) => {
    if (!code) return null;
    const key = code as Parameters<typeof t>[0];
    return t.has(key) ? t(key) : t("unknown");
  };
}

/** Translate a zod message key (validation.*). */
export function useFieldError<T>(state: ActionResult<T> | null) {
  const t = useTranslations("validation");
  return (name: string) => {
    if (!state || state.ok || !state.fieldErrors) return undefined;
    const code = state.fieldErrors[name]?.[0];
    if (!code) return undefined;
    const key = code as Parameters<typeof t>[0];
    return t.has(key) ? t(key) : t("invalid");
  };
}

export function FormError<T>({ state }: { state: ActionResult<T> | null }) {
  const errorText = useErrorText();
  if (!state || state.ok || state.error === "validation") return null;
  return <Alert tone="danger">{errorText(state.error)}</Alert>;
}
