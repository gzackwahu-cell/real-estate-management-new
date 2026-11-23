"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center rounded-xl border bg-card px-6 py-12 text-center">
      <span className="flex size-10 items-center justify-center rounded-xl bg-red-50 text-red-700">
        <AlertTriangle aria-hidden="true" className="size-5" />
      </span>
      <h1 className="mt-4 text-lg font-semibold text-danwell-navy">
        We could not load this page
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Something went wrong while reading your workspace. Try again; if it
        keeps happening, contact your administrator.
      </p>
      <Button type="button" onClick={reset} className="mt-5">
        Try again
      </Button>
    </div>
  );
}
