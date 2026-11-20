import Link from "next/link";
import { ContactManagementCard } from "@/components/portal/contact-management-card";
import { PortalPageHeader } from "@/components/portal/portal-page-header";
import { TenantReceiptTable } from "@/components/portal/tenant/tenant-tables";
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
import { loadTenantPortal } from "@/lib/portal/tenant";

export default async function TenantReceiptsPage() {
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

  const receipts = data.ledger?.receipts ?? [];

  return (
    <div className="space-y-6">
      <PortalPageHeader
        eyebrow="My tenancy"
        title="Receipts"
        description="Official proof of payments received for your own tenancy."
        action={
          <Link
            href="/tenant/payments"
            className="inline-flex h-9 items-center rounded-lg border px-3 text-sm font-medium text-danwell-navy hover:bg-muted"
          >
            Back to payments
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg text-danwell-navy">
              Payment receipts
            </CardTitle>
            <CardDescription>
              {receipts.length} receipt(s) issued for your payments.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TenantReceiptTable receipts={receipts} />
          </CardContent>
        </Card>

        <ContactManagementCard description="Missing a receipt? Message Danwell management with the payment reference." />
      </div>
    </div>
  );
}
