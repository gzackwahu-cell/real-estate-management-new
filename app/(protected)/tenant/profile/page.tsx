import Link from "next/link";
import { ContactManagementCard } from "@/components/portal/contact-management-card";
import { PortalDetail, PortalDetailList } from "@/components/portal/portal-detail-list";
import { PortalPageHeader } from "@/components/portal/portal-page-header";
import { EmptyState } from "@/components/portfolio/empty-state";
import { StatusBadge } from "@/components/portfolio/status-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { withRoles } from "@/lib/auth/guards";
import { ROLES } from "@/lib/auth/roles";
import { loadTenantPortal } from "@/lib/portal/tenant";
import { labelFor } from "@/lib/portfolio/constants";
import { TENANT_STATUSES, tenantStatusTone } from "@/lib/tenancy/constants";

export default async function TenantProfilePage() {
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

  const { tenant } = data;

  return (
    <div className="space-y-6">
      <PortalPageHeader
        eyebrow="My tenancy"
        title="Personal profile"
        description="Your own stored contact details. To correct a record, contact management on WhatsApp."
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
          <CardTitle className="text-lg text-danwell-navy">Profile details</CardTitle>
          <CardDescription>
            Only your own tenant record is loaded for your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <PortalDetailList columns="sm:grid-cols-2 lg:grid-cols-3">
            <PortalDetail label="Full name" value={tenant.full_name} />
            <PortalDetail label="Phone" value={tenant.phone} />
            <PortalDetail label="Email" value={tenant.email || "Not provided"} />
            <PortalDetail label="Reference" value={tenant.id_reference} />
            <PortalDetail label="Address" value={tenant.address} />
            <PortalDetail
              label="Status"
              value={
                <StatusBadge
                  label={labelFor(TENANT_STATUSES, tenant.status)}
                  tone={tenantStatusTone(tenant.status)}
                />
              }
            />
            <PortalDetail
              label="Emergency contact"
              value={
                tenant.emergency_contact_name && tenant.emergency_contact_phone
                  ? `${tenant.emergency_contact_name} · ${tenant.emergency_contact_phone}`
                  : "Not provided"
              }
              className="sm:col-span-2"
            />
          </PortalDetailList>
        </CardContent>
      </Card>

      <ContactManagementCard description="Need to update your phone, email or emergency contact? Send the change request to Danwell management." />
    </div>
  );
}
