import Link from "next/link";
import type { ReactNode } from "react";
import { AlertCircle, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ReportSection as ReportSectionState } from "@/lib/reports/queries";

type ReportSectionProps<T> = {
  title: string;
  description: string;
  section: ReportSectionState<T>;
  href?: string;
  hrefLabel?: string;
  children: (data: T) => ReactNode;
};

export function ReportSection<T>({
  title,
  description,
  section,
  href,
  hrefLabel = "Open",
  children,
}: ReportSectionProps<T>) {
  const detailLink = href ? (
    <Link href={href} className="shrink-0 text-xs text-danwell-teal hover:underline">
      {hrefLabel}
    </Link>
  ) : null;

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
        <div>
          <CardTitle className="text-base text-danwell-navy">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          {detailLink}
          {section.state === "denied" ? (
            <Badge tone="muted">Restricted</Badge>
          ) : null}
          {section.state === "error" ? (
            <Badge tone="warning">Unavailable</Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        {section.state === "ready" ? (
          children(section.data)
        ) : (
          <div className="flex items-start gap-2 rounded-lg border border-dashed bg-muted/30 p-3 text-sm text-muted-foreground">
            {section.state === "denied" ? (
              <Lock aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            ) : (
              <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            )}
            <span>{section.message}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
