import { PlaceholderCard } from "@/components/auth/placeholder-card";

export default function DashboardPage() {
  return (
    <PlaceholderCard
      eyebrow="Stage 1 foundation"
      title="Staff dashboard"
      description="Authentication, the property portfolio and tenant/lease management are in place."
      items={[
        "Properties, owners and units",
        "Tenants, applications and leases",
        "Server-side permissions and RLS",
        "Private tenant records and lease history",
      ]}
    />
  );
}
