import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AdjustmentTable,
  AllocationTable,
  AuditTable,
  ReversalTable,
} from "@/components/finance/finance-tables";
import { IssueReceiptForm } from "@/components/finance/issue-receipt-form";
import { PaymentAllocationForm } from "@/components/finance/payment-allocation-form";
import { ReallocatePaymentForm } from "@/components/finance/reallocate-payment-form";
import { ReversePaymentForm } from "@/components/finance/reverse-payment-form";
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
  formatDate,
  formatMoney,
  labelFor,
  PAYMENT_TYPES,
} from "@/lib/finance/constants";
import {
  calculatePaymentCredits,
  getAuditLog,
  getFinanceLedger,
  getPayment,
} from "@/lib/finance/queries";

type PaymentDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default function PaymentDetailPage({ params }: PaymentDetailPageProps) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading payment...</p>}>
      <PaymentDetailContent params={params} />
    </Suspense>
  );
}

async function PaymentDetailContent({ params }: PaymentDetailPageProps) {
  const { id } = await params;

  const data = await withPermission(
    "payments",
    "view",
    async (_context, supabase) => {
      const payment = await getPayment(supabase, id);
      if (!payment) {
        return null;
      }
      const [ledger, audit] = await Promise.all([
        getFinanceLedger(supabase, { leaseId: payment.lease_id }),
        getAuditLog(supabase, { entityType: "payment", entityId: payment.id }),
      ]);
      return { payment, ledger, audit };
    },
  );

  if (!data) {
    notFound();
  }

  const { payment, ledger, audit } = data;
  const withCredit = calculatePaymentCredits(
    [payment],
    ledger.allocations,
    ledger.reversals,
  )[0];
  const paymentAllocations = ledger.allocations.filter(
    (allocation) => allocation.payment_id === payment.id,
  );
  const paymentReversals = ledger.reversals.filter(
    (reversal) => reversal.payment_id === payment.id,
  );
  const paymentAdjustments = ledger.adjustments.filter(
    (adjustment) => adjustment.payment_id === payment.id,
  );
  const chargeMap = new Map(ledger.charges.map((charge) => [charge.id, charge]));

  const canEdit = await hasPermission("payments", "edit");
  const canApprove = await hasPermission("payments", "approve");
  const canIssueReceipt = await hasPermission("payments", "edit");
  const hasCredit = withCredit.unallocated_amount > 0;
  const hasReceipt = Boolean(payment.receipts);

  const detailRows = [
    { label: "Tenant", value: payment.tenants?.full_name ?? "Tenant record" },
    {
      label: "Property / unit",
      value: `${payment.leases?.units?.properties?.title ?? "Property"} · ${
        payment.leases?.units?.unit_number ?? "Unit"
      }`,
    },
    { label: "Type", value: labelFor(PAYMENT_TYPES, payment.payment_type) },
    { label: "Method", value: payment.payment_methods?.name ?? "Payment method" },
    { label: "Payment date", value: formatDate(payment.payment_date) },
    { label: "Recorded at", value: formatDate(payment.created_at) },
    { label: "Reference", value: payment.transaction_reference || "—" },
    { label: "Original amount", value: formatMoney(payment.amount) },
    { label: "Effective amount", value: formatMoney(withCredit.effective_amount) },
    { label: "Allocated", value: formatMoney(withCredit.allocated_amount) },
    {
      label: "Unallocated credit",
      value: payment.payment_type === "rent" ? formatMoney(withCredit.unallocated_amount) : "—",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/finance/payments"
          className="text-sm text-danwell-teal hover:underline"
        >
          ← Back to payments
        </Link>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-danwell-navy">
              Payment · {formatMoney(payment.amount)}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {payment.tenants?.full_name ?? "Tenant"} · {formatDate(payment.payment_date)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {payment.receipts ? (
              <Link
                href={`/dashboard/finance/receipts/${payment.receipts.id}`}
                className="inline-flex h-8 items-center rounded-lg border px-3 text-sm font-medium hover:bg-muted"
              >
                View receipt {payment.receipts.receipt_number}
              </Link>
            ) : null}
            <Link
              href={`/dashboard/finance/statements?leaseId=${payment.lease_id}`}
              className="inline-flex h-8 items-center rounded-lg border px-3 text-sm font-medium hover:bg-muted"
            >
              Lease statement
            </Link>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-danwell-navy">Payment summary</CardTitle>
          <CardDescription>
            Original records stay unchanged. Reversals and reallocations are separate,
            audited records.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {detailRows.map((row) => (
              <div key={row.label}>
                <dt className="text-xs text-muted-foreground">{row.label}</dt>
                <dd className="mt-1 text-sm font-medium text-foreground">{row.value}</dd>
              </div>
            ))}
          </dl>
          {payment.notes ? (
            <p className="rounded-lg bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              {payment.notes}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-danwell-navy">Allocations</CardTitle>
          <CardDescription>
            {paymentAllocations.length} allocation(s) to rent charges
          </CardDescription>
        </CardHeader>
        <CardContent>
          {paymentAllocations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No allocations recorded.</p>
          ) : (
            <AllocationTable
              allocations={paymentAllocations}
              charges={paymentAllocations.flatMap((allocation) => {
                const charge = chargeMap.get(allocation.charge_id);
                return charge ? [charge] : [];
              })}
            />
          )}
        </CardContent>
      </Card>

      {canEdit && hasCredit && payment.payment_type === "rent" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-danwell-navy">Allocate unused credit</CardTitle>
            <CardDescription>
              Apply remaining credit to outstanding rent charges on this lease.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PaymentAllocationForm
              paymentId={payment.id}
              credit={withCredit.unallocated_amount}
              charges={ledger.charges}
            />
          </CardContent>
        </Card>
      ) : null}

      {canApprove && paymentAllocations.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-danwell-navy">Reallocate</CardTitle>
            <CardDescription>
              Move part of an existing allocation to another charge on the same lease.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ReallocatePaymentForm
              paymentId={payment.id}
              allocations={paymentAllocations.map((allocation) => ({
                id: allocation.id,
                label:
                  chargeMap.get(allocation.charge_id)?.period_month ?? "Rent charge",
                amount: allocation.amount,
              }))}
              charges={ledger.charges.map((charge) => ({
                id: charge.id,
                label: `${charge.period_month} · ${charge.leases?.tenants?.full_name ?? "Tenant"}`,
                balance: charge.balance,
              }))}
            />
          </CardContent>
        </Card>
      ) : null}

      {canApprove && withCredit.effective_amount > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-danwell-navy">Reverse payment</CardTitle>
            <CardDescription>
              Record a correction reason. The original payment remains in the history.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ReversePaymentForm
              paymentId={payment.id}
              remainingAmount={withCredit.effective_amount}
            />
          </CardContent>
        </Card>
      ) : null}

      {canIssueReceipt && !hasReceipt ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-danwell-navy">Issue receipt</CardTitle>
            <CardDescription>
              Generates a unique receipt number for this payment.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <IssueReceiptForm paymentId={payment.id} hasReceipt={hasReceipt} />
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-danwell-navy">Reversals</CardTitle>
            <CardDescription>Immutable correction records with reasons.</CardDescription>
          </CardHeader>
          <CardContent>
            {paymentReversals.length === 0 ? (
              <p className="text-sm text-muted-foreground">No reversals recorded.</p>
            ) : (
              <ReversalTable reversals={paymentReversals} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-danwell-navy">Allocation adjustments</CardTitle>
            <CardDescription>Manual reallocations recorded as audit entries.</CardDescription>
          </CardHeader>
          <CardContent>
            {paymentAdjustments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No adjustments recorded.</p>
            ) : (
              <AdjustmentTable adjustments={paymentAdjustments} />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-danwell-navy">Audit trail</CardTitle>
          <CardDescription>Who changed this payment, when and why.</CardDescription>
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
  );
}
