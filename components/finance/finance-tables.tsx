import Link from "next/link";
import { StatusBadge } from "@/components/portfolio/status-badge";
import {
  ADJUSTMENT_TYPES,
  chargeStatusTone,
  DEPOSIT_TRANSACTION_TYPES,
  formatDate,
  formatMoney,
  labelFor,
  PAYMENT_TYPES,
} from "@/lib/finance/constants";
import type {
  ChargeWithBalance,
  DepositWithBalance,
  PaymentWithCredit,
} from "@/lib/finance/queries";
import type {
  AdjustmentRecord,
  AllocationRecord,
  AuditRecord,
  DepositTransactionRecord,
  ReceiptRecord,
  ReversalRecord,
} from "@/lib/finance/validation";

const actionLink = "rounded-lg border px-2.5 py-1 text-xs hover:bg-muted";

function leaseLabel(lease: {
  tenants?: { full_name: string } | null;
  units?: { unit_number: string } | null;
} | null | undefined): string {
  if (!lease) return "Lease record";
  return `${lease.tenants?.full_name ?? "Tenant"} · ${lease.units?.unit_number ?? "Unit"}`;
}

export function ChargeTable({
  charges,
  limit,
}: {
  charges: ChargeWithBalance[];
  limit?: number;
}) {
  const rows = typeof limit === "number" ? charges.slice(0, limit) : charges;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[780px] text-sm">
        <thead className="border-b text-left text-xs text-muted-foreground">
          <tr>
            <th className="pb-2 font-medium">Period</th>
            <th className="pb-2 font-medium">Tenant / unit</th>
            <th className="pb-2 font-medium">Due date</th>
            <th className="pb-2 text-right font-medium">Billed</th>
            <th className="pb-2 text-right font-medium">Allocated</th>
            <th className="pb-2 text-right font-medium">Balance</th>
            <th className="pb-2 font-medium">Status</th>
            <th className="pb-2 text-right font-medium">Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((charge) => (
            <tr key={charge.id} className="border-b last:border-0">
              <td className="py-3 pr-4 font-medium">{formatDate(charge.period_month)}</td>
              <td className="py-3 pr-4">{leaseLabel(charge.leases)}</td>
              <td className="py-3 pr-4">{formatDate(charge.due_date)}</td>
              <td className="py-3 pr-4 text-right">{formatMoney(charge.effective_amount)}</td>
              <td className="py-3 pr-4 text-right">{formatMoney(charge.allocated_amount)}</td>
              <td className="py-3 pr-4 text-right font-medium">{formatMoney(charge.balance)}</td>
              <td className="py-3 pr-4">
                <StatusBadge
                  label={charge.payment_state}
                  tone={chargeStatusTone(
                    Math.round(charge.allocated_amount * 100),
                    Math.round(charge.effective_amount * 100),
                  )}
                />
              </td>
              <td className="py-3 text-right">
                <Link
                  href={`/dashboard/finance/charges/${charge.id}`}
                  className={actionLink}
                >
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PaymentTable({
  payments,
  limit,
}: {
  payments: PaymentWithCredit[];
  limit?: number;
}) {
  const rows = typeof limit === "number" ? payments.slice(0, limit) : payments;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] text-sm">
        <thead className="border-b text-left text-xs text-muted-foreground">
          <tr>
            <th className="pb-2 font-medium">Date</th>
            <th className="pb-2 font-medium">Tenant / unit</th>
            <th className="pb-2 font-medium">Type</th>
            <th className="pb-2 font-medium">Method</th>
            <th className="pb-2 font-medium">Reference</th>
            <th className="pb-2 text-right font-medium">Amount</th>
            <th className="pb-2 text-right font-medium">Credit</th>
            <th className="pb-2 text-right font-medium">Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((payment) => (
            <tr key={payment.id} className="border-b last:border-0">
              <td className="py-3 pr-4">{formatDate(payment.payment_date)}</td>
              <td className="py-3 pr-4">{leaseLabel(payment.leases)}</td>
              <td className="py-3 pr-4">{labelFor(PAYMENT_TYPES, payment.payment_type)}</td>
              <td className="py-3 pr-4">
                {payment.payment_methods?.name ?? "Payment method"}
              </td>
              <td className="py-3 pr-4">{payment.transaction_reference || "—"}</td>
              <td className="py-3 pr-4 text-right">{formatMoney(payment.effective_amount)}</td>
              <td className="py-3 pr-4 text-right">
                {payment.payment_type === "rent" && payment.unallocated_amount > 0
                  ? formatMoney(payment.unallocated_amount)
                  : "—"}
              </td>
              <td className="py-3 text-right">
                <Link
                  href={`/dashboard/finance/payments/${payment.id}`}
                  className={actionLink}
                >
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DepositTable({ deposits }: { deposits: DepositWithBalance[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[700px] text-sm">
        <thead className="border-b text-left text-xs text-muted-foreground">
          <tr>
            <th className="pb-2 font-medium">Tenant / unit</th>
            <th className="pb-2 text-right font-medium">Required</th>
            <th className="pb-2 text-right font-medium">Held</th>
            <th className="pb-2 text-right font-medium">Outstanding</th>
            <th className="pb-2 text-right font-medium">Action</th>
          </tr>
        </thead>
        <tbody>
          {deposits.map((deposit) => (
            <tr key={deposit.id} className="border-b last:border-0">
              <td className="py-3 pr-4 font-medium">{leaseLabel(deposit.leases)}</td>
              <td className="py-3 pr-4 text-right">{formatMoney(deposit.required_amount)}</td>
              <td className="py-3 pr-4 text-right">{formatMoney(deposit.held_amount)}</td>
              <td className="py-3 pr-4 text-right font-medium">
                {deposit.outstanding_amount < 0
                  ? `${formatMoney(Math.abs(deposit.outstanding_amount))} credit`
                  : formatMoney(deposit.outstanding_amount)}
              </td>
              <td className="py-3 text-right">
                <Link
                  href={`/dashboard/finance/deposits/${deposit.id}`}
                  className={actionLink}
                >
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ReceiptTable({ receipts }: { receipts: ReceiptRecord[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-sm">
        <thead className="border-b text-left text-xs text-muted-foreground">
          <tr>
            <th className="pb-2 font-medium">Receipt no.</th>
            <th className="pb-2 font-medium">Payment date</th>
            <th className="pb-2 font-medium">Tenant / unit</th>
            <th className="pb-2 font-medium">Method</th>
            <th className="pb-2 text-right font-medium">Amount</th>
            <th className="pb-2 text-right font-medium">Action</th>
          </tr>
        </thead>
        <tbody>
          {receipts.map((receipt) => (
            <tr key={receipt.id} className="border-b last:border-0">
              <td className="py-3 pr-4 font-medium">{receipt.receipt_number}</td>
              <td className="py-3 pr-4">
                {formatDate(receipt.payments?.payment_date)}
              </td>
              <td className="py-3 pr-4">{leaseLabel(receipt.payments?.leases)}</td>
              <td className="py-3 pr-4">
                {receipt.payments?.payment_methods?.name ?? "Payment method"}
              </td>
              <td className="py-3 pr-4 text-right">
                {formatMoney(receipt.payments?.amount ?? 0)}
              </td>
              <td className="py-3 text-right">
                <Link
                  href={`/dashboard/finance/receipts/${receipt.id}`}
                  className={actionLink}
                >
                  Print
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AllocationTable({
  allocations,
  charges,
}: {
  allocations: AllocationRecord[];
  charges: ChargeWithBalance[];
}) {
  const chargeMap = new Map(charges.map((charge) => [charge.id, charge]));

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-sm">
        <thead className="border-b text-left text-xs text-muted-foreground">
          <tr>
            <th className="pb-2 font-medium">Charge period</th>
            <th className="pb-2 font-medium">Due date</th>
            <th className="pb-2 text-right font-medium">Allocated</th>
            <th className="pb-2 font-medium">Allocated at</th>
          </tr>
        </thead>
        <tbody>
          {allocations.map((allocation) => {
            const charge = chargeMap.get(allocation.charge_id);
            return (
              <tr key={allocation.id} className="border-b last:border-0">
                <td className="py-3 pr-4 font-medium">
                  {formatDate(charge?.period_month)}
                </td>
                <td className="py-3 pr-4">{formatDate(charge?.due_date)}</td>
                <td className="py-3 pr-4 text-right">{formatMoney(allocation.amount)}</td>
                <td className="py-3 pr-4">{formatDate(allocation.allocated_at)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function AuditTable({ entries }: { entries: AuditRecord[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[600px] text-sm">
        <thead className="border-b text-left text-xs text-muted-foreground">
          <tr>
            <th className="pb-2 font-medium">When</th>
            <th className="pb-2 font-medium">Action</th>
            <th className="pb-2 font-medium">Reason</th>
            <th className="pb-2 font-medium">Actor</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id} className="border-b last:border-0">
              <td className="py-3 pr-4">{formatDate(entry.created_at)}</td>
              <td className="py-3 pr-4 font-medium">{entry.action}</td>
              <td className="py-3 pr-4">{entry.reason}</td>
              <td className="py-3 pr-4">{entry.actor_email ?? "System"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DepositTransactionTable({
  transactions,
}: {
  transactions: DepositTransactionRecord[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm">
        <thead className="border-b text-left text-xs text-muted-foreground">
          <tr>
            <th className="pb-2 font-medium">Date</th>
            <th className="pb-2 font-medium">Type</th>
            <th className="pb-2 font-medium">Reference</th>
            <th className="pb-2 font-medium">Reason</th>
            <th className="pb-2 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((transaction) => (
            <tr key={transaction.id} className="border-b last:border-0">
              <td className="py-3 pr-4">{formatDate(transaction.transaction_date)}</td>
              <td className="py-3 pr-4">
                {labelFor(DEPOSIT_TRANSACTION_TYPES, transaction.transaction_type)}
              </td>
              <td className="py-3 pr-4">{transaction.transaction_reference || "—"}</td>
              <td className="py-3 pr-4">{transaction.reason}</td>
              <td
                className={`py-3 text-right font-medium ${
                  transaction.amount < 0 ? "text-amber-700" : "text-emerald-700"
                }`}
              >
                {formatMoney(transaction.amount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AdjustmentTable({ adjustments }: { adjustments: AdjustmentRecord[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="border-b text-left text-xs text-muted-foreground">
          <tr>
            <th className="pb-2 font-medium">When</th>
            <th className="pb-2 font-medium">Type</th>
            <th className="pb-2 font-medium">Reason</th>
            <th className="pb-2 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {adjustments.map((adjustment) => (
            <tr key={adjustment.id} className="border-b last:border-0">
              <td className="py-3 pr-4">{formatDate(adjustment.created_at)}</td>
              <td className="py-3 pr-4">
                {labelFor(ADJUSTMENT_TYPES, adjustment.adjustment_type)}
              </td>
              <td className="py-3 pr-4">{adjustment.reason}</td>
              <td className="py-3 text-right font-medium">
                {formatMoney(adjustment.amount_delta)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ReversalTable({ reversals }: { reversals: ReversalRecord[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-sm">
        <thead className="border-b text-left text-xs text-muted-foreground">
          <tr>
            <th className="pb-2 font-medium">When</th>
            <th className="pb-2 font-medium">Reason</th>
            <th className="pb-2 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {reversals.map((reversal) => (
            <tr key={reversal.id} className="border-b last:border-0">
              <td className="py-3 pr-4">{formatDate(reversal.created_at)}</td>
              <td className="py-3 pr-4">{reversal.reason}</td>
              <td className="py-3 text-right font-medium">{formatMoney(reversal.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
