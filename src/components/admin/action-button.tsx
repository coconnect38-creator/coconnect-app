"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { useErrorText } from "@/components/forms/form-bits";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import type { ActionResult } from "@/lib/result";

/**
 * Runs a bound server action (e.g. reviewJob.bind(null, id, false)).
 * With `reason`, it first asks for a reason — optionally from preset choices.
 */
export function ActionButton({
  action,
  label,
  confirmText,
  reason,
  presets,
  variant = "outline",
  size = "sm",
  inputType = "text",
}: {
  action: (arg?: string) => Promise<ActionResult<unknown>>;
  label: string;
  confirmText?: string;
  reason?: string;
  presets?: string[];
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  inputType?: "text" | "number";
}) {
  const t = useTranslations("admin.common");
  const errorText = useErrorText();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState("");
  const [text, setText] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const run = (arg?: string) =>
    start(async () => {
      const res = await action(arg);
      setMsg(res.ok ? { ok: true, text: t("done") } : { ok: false, text: errorText(res.error) ?? "" });
      if (res.ok) setOpen(false);
    });

  if (reason && open) {
    const value = [preset, text.trim()].filter(Boolean).join(" — ");
    return (
      <div className="w-full space-y-2 rounded-lg border border-border bg-muted/50 p-3">
        <p className="text-sm font-semibold">{reason}</p>
        {presets?.length ? (
          <Select value={preset} onChange={(e) => setPreset(e.target.value)} aria-label={reason}>
            <option value="">{t("choosePreset")}</option>
            {presets.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </Select>
        ) : null}
        <Input type={inputType} value={text} onChange={(e) => setText(e.target.value)} placeholder={presets?.length ? t("addDetail") : ""} aria-label={reason} />
        <div className="flex gap-2">
          <Button size="sm" variant={variant} disabled={pending || (inputType === "text" ? value.length < 3 : !text)} onClick={() => run(inputType === "number" ? text : value)}>
            {label}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>{t("cancel")}</Button>
        </div>
        {msg && !msg.ok ? <p className="text-xs text-danger">{msg.text}</p> : null}
      </div>
    );
  }

  return (
    <span className="inline-flex flex-col gap-1">
      <Button
        size={size}
        variant={variant}
        disabled={pending}
        onClick={() => {
          if (reason) return setOpen(true);
          if (confirmText && !confirm(confirmText)) return;
          run();
        }}
      >
        {label}
      </Button>
      {msg ? <span className={`text-xs ${msg.ok ? "text-success-fg" : "text-danger"}`}>{msg.text}</span> : null}
    </span>
  );
}
