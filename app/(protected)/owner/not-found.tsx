import { EmptyState } from "@/components/portfolio/empty-state";

export default function OwnerNotFound() {
  return (
    <EmptyState
      title="Record not found"
      description="This record is unavailable or is not linked to your verified ownership."
      href="/owner"
      actionLabel="Back to owner overview"
    />
  );
}
