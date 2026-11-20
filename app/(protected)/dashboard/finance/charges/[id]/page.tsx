import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/portfolio/status-badge";
import { ChargeAdjustmentForm } from "@/components/finance/charge-adjustment-form";
import {
  AdjustmentTable,
  AllocationTable,
  AuditTable,
  PaymentTable,
} from "@/components/finance/finance-tables";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { hasPermission } from "@/lib/auth/dal";
import { withPermission } from "@/lib/auth/guards";
import {
  chargeStatusTone,
  formatDate,
  formatMoney,
} from "@/lib/finance/constants";
import {
  getAuditLog,
  getCharge,
  getFinanceLedger,
} from "@/lib/finance/queries";

type ChargeDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default function ChargeDetailPage({ params }: ChargeDetailPageProps) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading charge...</p>}>
      <ChargeDetailContent params={params} />
    </Suspense>
  );
}

async function ChargeDetailContent({ params }: ChargeDetailPageProps) {
  const { id } = await params;

  const data = await withPermission("rent", "view", async (_context, supabase) => {
    const charge = await getCharge(supabase, id);
    if (!charge) {
      return null;
    }
    const [ledger, audit] = await Promise.all([
      getFinanceLedger(supabase, { leaseId: charge.lease_id }),
      getAuditLog(supabase, { entityType: "rent_charge", entityId: charge.id }),
    ]);
    return { charge, ledger, audit };
  });

  if (!data) {
    notFound();
  }

  const { charge, ledger, audit } = data;
  const withBalance =
    ledger.charges.find((item) => item.id === charge.id) ?? null;
  const chargeAllocations = ledger.allocations.filter(
    (allocation) => allocation.charge_id === charge.id,
  );
  const chargeAdjustments = ledger.adjustments.filter(
    (adjustment) => adjustment.charge_id === charge.id,
  );
  const relatedPaymentIds = new Set(chargeAllocations.map((item) => item.payment_id));
  const relatedPayments = ledger.payments.filter((payment) =>
    relatedPaymentIds.has(payment.id),
  );
  const canAdjust = await hasPermission("rent", "approve");

  const detailRows = [
    { label: "Rental period", value: charge.period_month },
    { label: "Period start", value: formatDate(charge.period_start) },
    { label: "Period end", value: formatDate(charge.period_end) },
    { label: "Due date", value: formatDate(charge.due_date) },
    { label: "Original amount", value: formatMoney(charge.amount) },
    { label: "Effective amount", value: formatMoney(withBalance?.effective_amount ?? charge.amount) },
    { label: "Allocated", value: formatMoney(withBalance?.allocated_amount ?? 0) },
    { label: "Outstanding", value: formatMoney(withBalance?.balance ?? charge.amount) },
    { label: "Source", value: charge.source },
    {
      label: "Tenant / unit",
      value: `${charge.leases?.tenants?.full_name ?? "Tenant"} · ${charge.leases?.units?.unit_number ?? "Unit"}`,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/finance/charges"
          className="text-sm text-danwell-teal hover:underline"
        >
          ← Back to charges
        </Link>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-danwell-navy">
              Rent charge · {charge.period_month}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {charge.leases?.tenants?.full_name ?? "Tenant"} ·{" "}
              {charge.leases?.units?.properties?.title ?? "Property"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {charge.leases ? (
              <Link
                href={`/dashboard/finance/statements?leaseId=${charge.lease_id}`}
                className="inline-flex h-8 items-center rounded-lg border px-3 text-sm font-medium hover:bg-muted"
              >
                Lease statement
              </Link>
            ) : null}
            <Link
              href={`/dashboard/leases/${charge.lease_id}`}
              className="inline-flex h-8 items-center rounded-lg border px-3 text-sm font-medium hover:bg-muted"
            >
              View lease
            </Link>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-danwell-navy">Charge summary</CardTitle>
          <CardDescription>
            The effective amount includes authorized adjustments. Outstanding is derived
            from allocations, not stored on the browser.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <StatusBadge
            label={withBalance?.payment_state ?? "outstanding"}
            tone={chargeStatusTone(
              Math.round((withBalance?.allocated_amount ?? 0) * 100),
              Math.round((withBalance?.effective_amount ?? charge.amount) * 100),
            )}
          />
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {detailRows.map((row) => (
              <div key={row.label}>
                <dt className="text-xs text-muted-foreground">{row.label}</dt>
                <dd className="mt-1 text-sm font-medium text-foreground">{row.value}</dd>
              </div>
            ))}
          </dl>
          {charge.notes ? (
            <p className="rounded-lg bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              {charge.notes}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {canAdjust ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-danwell-navy">Adjust this charge</CardTitle>
            <CardDescription>
              Authorized increase or reduction with a mandatory audited reason.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChargeAdjustmentForm
              chargeId={charge.id}
              effectiveAmount={withBalance?.effective_amount ?? charge.amount}
            />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-danwell-navy">Payment allocations</CardTitle>
          <CardDescription>
            {chargeAllocations.length} allocation(s) applied to this charge
          </CardDescription>
        </CardHeader>
        <CardContent>
          {chargeAllocations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payments have been allocated.</p>
          ) : (
            <AllocationTable
              allocations={chargeAllocations}
              charges={withBalance ? [withBalance] : []}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-danwell-navy">Payments applied</CardTitle>
          <CardDescription>Payments linked to this charge through the allocation ledger.</CardDescription>
        </CardHeader>
        <CardContent>
          {relatedPayments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No linked payments yet.</p>
          ) : (
            <PaymentTable payments={relatedPayments} />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-danwell-navy">Adjustment history</CardTitle>
            <CardDescription>Audited changes to this charge.</CardDescription>
          </CardHeader>
          <CardContent>
            {chargeAdjustments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No adjustments recorded.</p>
            ) : (
              <AdjustmentTable adjustments={chargeAdjustments} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-danwell-navy">Audit trail</CardTitle>
            <CardDescription>Actor, timestamp and reason for changes.</CardDescription>
          </CardHeader>
          <CardContent>
            {audit.length === 0 ? (
              <p className="text-sm text-muted-foreground">No audit events recorded.</p>
            ) : (
              <AuditTable entries={audit} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
