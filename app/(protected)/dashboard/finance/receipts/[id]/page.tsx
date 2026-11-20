import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/finance/print-button";
import { AGENCY } from "@/lib/constants/agency";
import { withPermission } from "@/lib/auth/guards";
import {
  formatDate,
  formatDateTime,
  formatMoney,
  labelFor,
  PAYMENT_TYPES,
} from "@/lib/finance/constants";
import {
  getFinanceLedger,
  getReceipt,
} from "@/lib/finance/queries";

type ReceiptDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default function ReceiptDetailPage({ params }: ReceiptDetailPageProps) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading receipt...</p>}>
      <ReceiptDetailContent params={params} />
    </Suspense>
  );
}

async function ReceiptDetailContent({ params }: ReceiptDetailPageProps) {
  const { id } = await params;

  const data = await withPermission("payments", "view", async (_context, supabase) => {
    const receipt = await getReceipt(supabase, id);
    if (!receipt?.payments) {
      return null;
    }
    const ledger = await getFinanceLedger(supabase, {
      leaseId: receipt.payments.lease_id,
    });
    return { receipt, ledger };
  });

  if (!data) {
    notFound();
  }

  const { receipt, ledger } = data;
  const payment = receipt.payments;
  if (!payment) {
    notFound();
  }

  const allocations = ledger.allocations.filter(
    (allocation) => allocation.payment_id === payment.id,
  );
  const chargeMap = new Map(ledger.charges.map((charge) => [charge.id, charge]));
  const outstanding = ledger.charges.reduce(
    (total, charge) => total + Math.max(0, charge.balance),
    0,
  );

  const rows = [
    { label: "Tenant", value: payment.tenants?.full_name ?? "Tenant record" },
    {
      label: "Property / unit",
      value: `${payment.leases?.units?.properties?.title ?? "Property"} · ${
        payment.leases?.units?.unit_number ?? "Unit"
      }`,
    },
    { label: "Payment type", value: labelFor(PAYMENT_TYPES, payment.payment_type) },
    { label: "Payment method", value: payment.payment_methods?.name ?? "Payment method" },
    { label: "Transaction reference", value: payment.transaction_reference || "—" },
    { label: "Payment date", value: formatDate(payment.payment_date) },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <style>{`@media print { header, nav, button { display: none !important; } main { padding: 0 !important; } body { background: #fff !important; } }`}</style>

      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href="/dashboard/finance/receipts"
          className="text-sm text-danwell-teal hover:underline"
        >
          ← Back to receipts
        </Link>
        <div className="flex gap-2">
          <Link
            href={`/dashboard/finance/payments/${payment.id}`}
            className="inline-flex h-8 items-center rounded-lg border px-3 text-sm font-medium hover:bg-muted"
          >
            View payment
          </Link>
          <PrintButton />
        </div>
      </div>

      <div className="rounded-xl border bg-white px-6 py-8 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-6 border-b border-danwell-navy/15 pb-6">
          <div>
            <p className="text-xl font-semibold text-danwell-navy">{AGENCY.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">{AGENCY.tagline}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              {AGENCY.email} · {AGENCY.whatsappNumber}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs tracking-[0.16em] text-danwell-teal uppercase">Receipt</p>
            <p className="mt-1 text-lg font-semibold text-danwell-navy">
              {receipt.receipt_number}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Issued {formatDateTime(receipt.issued_at)}
            </p>
          </div>
        </div>

        <div className="py-6">
          <p className="text-xs tracking-[0.16em] text-danwell-teal uppercase">
            Payment received
          </p>
          <p className="mt-2 text-3xl font-semibold text-danwell-navy">
            {formatMoney(payment.amount)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            From {payment.tenants?.full_name ?? "Tenant"} for{" "}
            {payment.leases?.units?.unit_number ?? "unit"} ·{" "}
            {payment.leases?.units?.properties?.title ?? "property"}
          </p>
        </div>

        <dl className="grid gap-4 border-t border-danwell-navy/10 py-6 sm:grid-cols-2">
          {rows.map((row) => (
            <div key={row.label}>
              <dt className="text-xs text-muted-foreground">{row.label}</dt>
              <dd className="mt-1 text-sm font-medium text-foreground">{row.value}</dd>
            </div>
          ))}
        </dl>

        <div className="border-t border-danwell-navy/10 py-6">
          <p className="text-xs tracking-[0.16em] text-danwell-teal uppercase">
            Allocation summary
          </p>
          {allocations.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Payment recorded with no charge allocation.
            </p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="pb-2 font-medium">Rent period</th>
                    <th className="pb-2 font-medium">Due date</th>
                    <th className="pb-2 text-right font-medium">Amount applied</th>
                  </tr>
                </thead>
                <tbody>
                  {allocations.map((allocation) => {
                    const charge = chargeMap.get(allocation.charge_id);
                    return (
                      <tr key={allocation.id} className="border-b last:border-0">
                        <td className="py-2 pr-4">{charge?.period_month ?? "Rent charge"}</td>
                        <td className="py-2 pr-4">{formatDate(charge?.due_date)}</td>
                        <td className="py-2 text-right font-medium">
                          {formatMoney(allocation.amount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-end justify-between gap-4 border-t border-danwell-navy/10 pt-6">
          <div>
            <p className="text-xs text-muted-foreground">Outstanding rent on this lease</p>
            <p className="mt-1 text-lg font-semibold text-danwell-navy">
              {formatMoney(outstanding)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Authorized receipt</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {receipt.notes || "Issued under Danwell financial controls."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
