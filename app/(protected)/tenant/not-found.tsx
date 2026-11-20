import { EmptyState } from "@/components/portfolio/empty-state";

export default function TenantNotFound() {
  return (
    <EmptyState
      title="Record not found"
      description="This record is unavailable or does not belong to your tenancy."
      href="/tenant"
      actionLabel="Back to tenant overview"
    />
  );
}
