import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-xl border border-border bg-card p-4 sm:p-6", className)} {...props} />;
}

export function Badge({
  className,
  tone = "neutral",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: "neutral" | "green" | "clay" | "warning" | "danger" }) {
  const tones = {
    neutral: "bg-muted text-muted-foreground",
    green: "bg-success-bg text-success-fg",
    clay: "bg-clay/15 text-clay",
    warning: "bg-warning-bg text-warning-fg",
    danger: "bg-danger/10 text-danger",
  };
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", tones[tone], className)}
      {...props}
    />
  );
}

export function Alert({
  className,
  tone = "warning",
  ...props
}: HTMLAttributes<HTMLDivElement> & { tone?: "warning" | "success" | "danger" | "info" }) {
  const tones = {
    warning: "bg-warning-bg text-warning-fg border-warning-fg/20",
    success: "bg-success-bg text-success-fg border-success-fg/20",
    danger: "bg-danger/10 text-danger border-danger/20",
    info: "bg-muted text-foreground border-border",
  };
  return <div role="status" className={cn("rounded-lg border px-4 py-3 text-sm", tones[tone], className)} {...props} />;
}
