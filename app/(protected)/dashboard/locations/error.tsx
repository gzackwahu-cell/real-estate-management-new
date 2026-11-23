"use client";

import { Button } from "@/components/ui/button";

export default function LocationsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="rounded-xl border border-dashed bg-card p-6">
      <p className="font-medium text-danwell-navy">Locations unavailable</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {error.digest
          ? `Counties and areas could not be loaded (reference ${error.digest}).`
          : "Counties and areas could not be loaded. Please try again."}
      </p>
      <Button type="button" size="sm" className="mt-4" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
