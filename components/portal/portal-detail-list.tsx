import type { ReactNode } from "react";

export function PortalDetailList({
  children,
  columns = "sm:grid-cols-2",
}: {
  children: ReactNode;
  columns?: string;
}) {
  return <dl className={`grid gap-4 ${columns}`}>{children}</dl>;
}

export function PortalDetail({
  label,
  value,
  className,
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm text-foreground">{value}</dd>
    </div>
  );
}
