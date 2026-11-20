import type { ReactNode } from "react";

type PortalPageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
};

export function PortalPageHeader({
  eyebrow,
  title,
  description,
  action,
}: PortalPageHeaderProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-xs font-medium tracking-[0.18em] text-danwell-teal uppercase">
          {eyebrow}
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-danwell-navy">{title}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          {description}
        </p>
      </div>
      {action}
    </div>
  );
}
