"use client";

import { PortalError } from "@/components/portal/portal-error";

export default function TenantError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <PortalError error={error} reset={reset} />;
}
