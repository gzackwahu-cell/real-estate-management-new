"use client";

import { useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type PortalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
};

export function PortalError({
  error,
  reset,
  title = "We could not load this portal page",
}: PortalErrorProps) {
  useEffect(() => {
    console.error("Portal page error", error);
  }, [error]);

  return (
    <Card className="mx-auto max-w-xl border-dashed border-amber-500/30">
      <CardHeader>
        <CardTitle className="text-lg text-danwell-navy">{title}</CardTitle>
        <CardDescription>
          Your data has not been changed. Try again, or return to the portal
          overview.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-9 items-center rounded-lg bg-danwell-navy px-4 text-sm font-medium text-white hover:bg-danwell-navy/90"
        >
          Try again
        </button>
      </CardContent>
    </Card>
  );
}
