import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";

const badgeVariants = cva(
  "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-4 whitespace-nowrap",
  {
    variants: {
      tone: {
        neutral: "border-danwell-navy/15 bg-danwell-navy/5 text-danwell-navy",
        positive: "border-emerald-600/20 bg-emerald-50 text-emerald-700",
        warning: "border-amber-600/20 bg-amber-50 text-amber-700",
        danger: "border-red-600/20 bg-red-50 text-red-700",
        info: "border-sky-600/20 bg-sky-50 text-sky-700",
        muted: "border-muted bg-muted text-muted-foreground",
      },
    },
    defaultVariants: {
      tone: "neutral",
    },
  },
);

export type BadgeTone = NonNullable<VariantProps<typeof badgeVariants>["tone"]>;

export function Badge({
  className,
  tone,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ tone }), className)}
      {...props}
    />
  );
}
