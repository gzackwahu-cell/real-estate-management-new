import Link from "next/link";
import { ContactManagementCard } from "@/components/portal/contact-management-card";
import { PortalPageHeader } from "@/components/portal/portal-page-header";
import { TenantLeaseCards } from "@/components/portal/tenant/tenant-lease-cards";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/portfolio/empty-state";
import { withRoles } from "@/lib/auth/guards";
import { ROLES } from "@/lib/auth/roles";
import { isCurrentLeaseStatus, isPreviousLeaseStatus } from "@/lib/tenancy/constants";
import { loadTenantPortal } from "@/lib/portal/tenant";

export default async function TenantLeasesPage() {
  const data = await withRoles(
    [ROLES.TENANT, ROLES.SUPER_ADMIN, ROLES.ADMIN],
    (_context, supabase) => loadTenantPortal(supabase, _context.userId),
  );

  if (!data) {
    return (
      <EmptyState
        title="No tenancy profile linked"
        description="Contact management if your account should be linked to a tenant record."
      />
    );
  }

  const current = data.leases.filter((lease) => isCurrentLeaseStatus(lease.status));
  const previous = data.leases.filter((lease) => isPreviousLeaseStatus(lease.status));

  return (
    <div className="space-y-6">
      <PortalPageHeader
        eyebrow="My tenancy"
        title="Leases & property"
        description="Your lease dates, property and unit details. Only your own lease records are loaded."
        action={
          <Link
            href="/tenant"
            className="inline-flex h-9 items-center rounded-lg border px-3 text-sm font-medium text-danwell-navy hover:bg-muted"
          >
            Back to overview
          </Link>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-danwell-navy">Current lease</CardTitle>
          <CardDescription>Active and pending lease records.</CardDescription>
        </CardHeader>
        <CardContent>
          <TenantLeaseCards
            leases={current}
            leaseAttachments={data.leaseAttachments}
            emptyMessage="You do not have a current lease on record."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-danwell-navy">Previous leases</CardTitle>
          <CardDescription>Expired and terminated lease history.</CardDescription>
        </CardHeader>
        <CardContent>
          <TenantLeaseCards
            leases={previous}
            leaseAttachments={data.leaseAttachments}
            emptyMessage="You do not have previous leases on record."
          />
        </CardContent>
      </Card>

      <ContactManagementCard description="Need a lease renewal or a copy of your lease agreement? Message Danwell management." />
    </div>
  );
}
