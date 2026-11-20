import Link from "next/link";
import { ContactManagementCard } from "@/components/portal/contact-management-card";
import { PortalPageHeader } from "@/components/portal/portal-page-header";
import { PortalStatCard } from "@/components/portal/portal-stat-card";
import {
  TenantChargeTable,
  TenantDepositTable,
  TenantPaymentTable,
} from "@/components/portal/tenant/tenant-tables";
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
import { formatMoney } from "@/lib/tenancy/constants";
import {
  tenantCharges,
  tenantDeposits,
  tenantPayments,
  loadTenantPortal,
} from "@/lib/portal/tenant";

export default async function TenantPaymentsPage() {
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

  const charges = tenantCharges(data.ledger);
  const payments = tenantPayments(data.ledger);
  const deposits = tenantDeposits(data.ledger);
  const summary = data.summary;

  return (
    <div className="space-y-6">
      <PortalPageHeader
        eyebrow="My tenancy"
        title="Charges, balance & payments"
        description="Rent charges, payment history and deposit balances calculated from your own records."
        action={
          <Link
            href="/tenant/receipts"
            className="inline-flex h-9 items-center rounded-lg border px-3 text-sm font-medium text-danwell-navy hover:bg-muted"
          >
            View receipts
          </Link>
        }
      />

      {!summary ? (
        <EmptyState
          title="Financial records unavailable"
          description="The finance migration may still be pending. Your tenancy and maintenance records remain available."
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <PortalStatCard label="Rent billed" value={formatMoney(summary.totalBilled)} accent="navy" />
            <PortalStatCard label="Rent collected" value={formatMoney(summary.totalCollected)} accent="teal" />
            <PortalStatCard label="Outstanding rent" value={formatMoney(summary.outstandingRent)} accent="gold" />
            <PortalStatCard
              label="Unallocated credit"
              value={formatMoney(summary.unallocatedPayments)}
              accent="navy"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <PortalStatCard label="Deposits held" value={formatMoney(summary.depositsHeld)} accent="teal" />
            <PortalStatCard
              label="Deposit outstanding"
              value={formatMoney(summary.depositsOutstanding)}
              accent="gold"
            />
          </div>
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-danwell-navy">Rent charges</CardTitle>
          <CardDescription>Monthly billing and amounts applied to your lease.</CardDescription>
        </CardHeader>
        <CardContent>
          <TenantChargeTable charges={charges} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-danwell-navy">Payment history</CardTitle>
          <CardDescription>Rent and deposit payments recorded for you.</CardDescription>
        </CardHeader>
        <CardContent>
          <TenantPaymentTable payments={payments} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-danwell-navy">Deposits</CardTitle>
            <CardDescription>Amounts required, held and outstanding.</CardDescription>
          </CardHeader>
          <CardContent>
            <TenantDepositTable deposits={deposits} />
          </CardContent>
        </Card>

        <ContactManagementCard description="Need help reconciling a payment or statement? Message Danwell management." />
      </div>
    </div>
  );
}
