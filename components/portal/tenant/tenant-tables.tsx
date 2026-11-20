import Link from "next/link";
import { StatusBadge } from "@/components/portfolio/status-badge";
import {
  chargeStatusTone,
  formatDate,
  formatMoney,
  labelFor as financeLabelFor,
  PAYMENT_TYPES,
} from "@/lib/finance/constants";
import type {
  ChargeWithBalance,
  DepositWithBalance,
  PaymentWithCredit,
} from "@/lib/finance/queries";
import type { ReceiptRecord } from "@/lib/finance/validation";

function EmptyRow({ message }: { message: string }) {
  return (
    <tr>
      <td colSpan={8} className="py-6 text-center text-sm text-muted-foreground">
        {message}
      </td>
    </tr>
  );
}

export function TenantChargeTable({
  charges,
  emptyMessage = "No rent charges on record.",
}: {
  charges: ChargeWithBalance[];
  emptyMessage?: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[620px] text-sm">
        <thead className="border-b text-left text-xs text-muted-foreground">
          <tr>
            <th className="pb-2 pr-4 font-medium">Period</th>
            <th className="pb-2 pr-4 font-medium">Due</th>
            <th className="pb-2 pr-4 text-right font-medium">Billed</th>
            <th className="pb-2 pr-4 text-right font-medium">Paid</th>
            <th className="pb-2 pr-4 text-right font-medium">Balance</th>
            <th className="pb-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {charges.length === 0 ? (
            <EmptyRow message={emptyMessage} />
          ) : (
            charges.map((charge) => (
              <tr key={charge.id} className="border-b last:border-0">
                <td className="py-2 pr-4 font-medium">{charge.period_month}</td>
                <td className="py-2 pr-4">{formatDate(charge.due_date)}</td>
                <td className="py-2 pr-4 text-right">
                  {formatMoney(charge.effective_amount)}
                </td>
                <td className="py-2 pr-4 text-right">
                  {formatMoney(charge.allocated_amount)}
                </td>
                <td className="py-2 pr-4 text-right font-medium">
                  {formatMoney(charge.balance)}
                </td>
                <td className="py-2">
                  <StatusBadge
                    label={charge.payment_state}
                    tone={chargeStatusTone(
                      Math.round(charge.allocated_amount * 100),
                      Math.round(charge.effective_amount * 100),
                    )}
                  />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function TenantPaymentTable({
  payments,
  emptyMessage = "No payments recorded.",
}: {
  payments: PaymentWithCredit[];
  emptyMessage?: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[600px] text-sm">
        <thead className="border-b text-left text-xs text-muted-foreground">
          <tr>
            <th className="pb-2 pr-4 font-medium">Date</th>
            <th className="pb-2 pr-4 font-medium">Type</th>
            <th className="pb-2 pr-4 font-medium">Method</th>
            <th className="pb-2 pr-4 font-medium">Reference</th>
            <th className="pb-2 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {payments.length === 0 ? (
            <EmptyRow message={emptyMessage} />
          ) : (
            payments.map((payment) => (
              <tr key={payment.id} className="border-b last:border-0">
                <td className="py-2 pr-4">{formatDate(payment.payment_date)}</td>
                <td className="py-2 pr-4">
                  {financeLabelFor(PAYMENT_TYPES, payment.payment_type)}
                </td>
                <td className="py-2 pr-4">
                  {payment.payment_methods?.name ?? "—"}
                </td>
                <td className="py-2 pr-4">
                  {payment.transaction_reference || "—"}
                </td>
                <td className="py-2 text-right font-medium">
                  {formatMoney(payment.effective_amount)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function TenantDepositTable({
  deposits,
  emptyMessage = "No deposit records on file.",
}: {
  deposits: DepositWithBalance[];
  emptyMessage?: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] text-sm">
        <thead className="border-b text-left text-xs text-muted-foreground">
          <tr>
            <th className="pb-2 pr-4 font-medium">Lease</th>
            <th className="pb-2 pr-4 text-right font-medium">Required</th>
            <th className="pb-2 pr-4 text-right font-medium">Held</th>
            <th className="pb-2 text-right font-medium">Outstanding</th>
          </tr>
        </thead>
        <tbody>
          {deposits.length === 0 ? (
            <EmptyRow message={emptyMessage} />
          ) : (
            deposits.map((deposit) => (
              <tr key={deposit.id} className="border-b last:border-0">
                <td className="py-2 pr-4">
                  {deposit.leases?.units?.unit_number ?? "Lease"}
                </td>
                <td className="py-2 pr-4 text-right">
                  {formatMoney(deposit.required_amount)}
                </td>
                <td className="py-2 pr-4 text-right">
                  {formatMoney(deposit.held_amount)}
                </td>
                <td className="py-2 text-right font-medium">
                  {formatMoney(Math.max(0, deposit.outstanding_amount))}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function TenantReceiptTable({
  receipts,
  emptyMessage = "No receipts have been issued.",
}: {
  receipts: ReceiptRecord[];
  emptyMessage?: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[460px] text-sm">
        <thead className="border-b text-left text-xs text-muted-foreground">
          <tr>
            <th className="pb-2 pr-4 font-medium">Receipt</th>
            <th className="pb-2 pr-4 font-medium">Date</th>
            <th className="pb-2 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {receipts.length === 0 ? (
            <EmptyRow message={emptyMessage} />
          ) : (
            receipts.map((receipt) => (
              <tr key={receipt.id} className="border-b last:border-0">
                <td className="py-2 pr-4 font-medium">
                  <Link
                    href={`/tenant/receipts/${receipt.id}`}
                    className="text-danwell-teal hover:underline"
                  >
                    {receipt.receipt_number}
                  </Link>
                </td>
                <td className="py-2 pr-4">
                  {formatDate(receipt.payments?.payment_date)}
                </td>
                <td className="py-2 text-right">
                  {formatMoney(receipt.payments?.amount ?? 0)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
