import { cn } from "cn";

type StatusBadgeProps = {
  label: string;
  tone?: "neutral" | "positive" | "warning" | "muted";
};

const tones: Record<NonNullable<StatusBadgeProps["tone"]>, string> = {
  neutral: "border-danwell-teal/20 bg-danwell-teal/10 text-danwell-teal",
  positive: "border-emerald-600/20 bg-emerald-600/10 text-emerald-700",
  warning: "border-amber-600/20 bg-amber-600/10 text-amber-700",
  muted: "border-border bg-muted text-muted-foreground",
};

export function StatusBadge({ label, tone = "neutral" }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2 py-0.5 text-xs font-medium",
        tones[tone],
      )}
    >
      {label}
    </span>
  );
}
