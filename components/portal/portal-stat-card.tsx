import type { ReactNode } from "react";

type PortalStatCardProps = {
  label: string;
  value: ReactNode;
  hint?: string;
  accent?: "navy" | "teal" | "gold";
};

const accentClasses: Record<NonNullable<PortalStatCardProps["accent"]>, string> = {
  navy: "border-l-danwell-navy",
  teal: "border-l-danwell-teal",
  gold: "border-l-danwell-gold",
};

export function PortalStatCard({
  label,
  value,
  hint,
  accent = "navy",
}: PortalStatCardProps) {
  return (
    <div className={`rounded-xl border border-l-4 bg-white p-4 ${accentClasses[accent]}`}>
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-danwell-navy">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
