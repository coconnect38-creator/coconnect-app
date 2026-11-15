import { Star } from "lucide-react";

export function Stars({ value, count, size = "sm" }: { value: number; count?: number; size?: "sm" | "md" }) {
  const px = size === "md" ? "size-5" : "size-4";
  return (
    <span className="inline-flex items-center gap-1" aria-label={`${Number(value).toFixed(1)} / 5`}>
      <span className="flex" aria-hidden>
        {[1, 2, 3, 4, 5].map((n) => (
          <Star key={n} className={`${px} ${n <= Math.round(value) ? "fill-clay text-clay" : "text-border"}`} />
        ))}
      </span>
      <span className="text-sm font-semibold">{Number(value).toFixed(1)}</span>
      {count !== undefined ? <span className="text-sm text-muted-foreground">({count})</span> : null}
    </span>
  );
}
