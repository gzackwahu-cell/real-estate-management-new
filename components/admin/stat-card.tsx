import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "cn";

type StatCardProps = {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  tone?: "default" | "teal" | "gold" | "warning";
  href?: string;
};

const toneClass: Record<NonNullable<StatCardProps["tone"]>, string> = {
  default: "bg-danwell-navy/5 text-danwell-navy",
  teal: "bg-emerald-50 text-emerald-700",
  gold: "bg-amber-50 text-amber-700",
  warning: "bg-red-50 text-red-700",
};

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  href,
}: StatCardProps) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="truncate text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          {label}
        </p>
        {Icon ? (
          <span
            className={cn(
              "flex size-7 shrink-0 items-center justify-center rounded-lg",
              toneClass[tone],
            )}
          >
            <Icon aria-hidden="true" className="size-3.5" />
          </span>
        ) : null}
      </div>
      <p className="mt-3 text-xl font-semibold tracking-tight text-danwell-navy tabular-nums">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </>
  );

  const className =
    "block rounded-xl border bg-card p-4 transition-colors hover:border-danwell-navy/25 hover:bg-muted/40";

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}
