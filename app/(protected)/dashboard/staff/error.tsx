"use client";

import { Button } from "@/components/ui/button";

export default function StaffError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="rounded-xl border border-dashed bg-card p-6">
      <p className="font-medium text-danwell-navy">Staff access unavailable</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {error.digest
          ? `Users, roles and permissions could not be loaded (reference ${error.digest}).`
          : "Users, roles and permissions could not be loaded. Please try again."}
      </p>
      <Button type="button" size="sm" className="mt-4" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
