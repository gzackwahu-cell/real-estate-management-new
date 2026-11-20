import { cn } from "cn";

export function StatusPill({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "positive" | "warning" | "muted";
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
        tone === "positive" && "bg-emerald-50 text-emerald-700",
        tone === "warning" && "bg-amber-50 text-amber-700",
        tone === "muted" && "bg-slate-100 text-slate-600",
        tone === "neutral" && "bg-danwell-navy/5 text-danwell-navy",
      )}
    >
      {label}
    </span>
  );
}
