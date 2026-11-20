import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AuditTable,
  DepositTransactionTable,
} from "@/components/finance/finance-tables";
import { DepositTransactionForm } from "@/components/finance/deposit-transaction-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { hasPermission } from "@/lib/auth/dal";
import { withPermission } from "@/lib/auth/guards";
import { formatDate, formatMoney } from "@/lib/finance/constants";
import {
  calculateDepositBalances,
  getAuditLog,
  getDeposit,
  getFinanceLedger,
} from "@/lib/finance/queries";

type DepositDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default function DepositDetailPage({ params }: DepositDetailPageProps) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading deposit...</p>}>
      <DepositDetailContent params={params} />
    </Suspense>
  );
}

async function DepositDetailContent({ params }: DepositDetailPageProps) {
  const { id } = await params;

  const data = await withPermission("deposits", "view", async (_context, supabase) => {
    const deposit = await getDeposit(supabase, id);
    if (!deposit) {
      return null;
    }
    const [ledger, audit] = await Promise.all([
      getFinanceLedger(supabase, { leaseId: deposit.lease_id }),
      getAuditLog(supabase, { entityType: "deposit", entityId: deposit.id }),
    ]);
    return { deposit, ledger, audit };
  });

  if (!data) {
    notFound();
  }

  const { deposit, ledger, audit } = data;
  const withBalance = calculateDepositBalances(
    [deposit],
    ledger.depositTransactions,
  )[0];
  const transactions = ledger.depositTransactions.filter(
    (transaction) => transaction.deposit_id === deposit.id,
  );
  const canEdit = await hasPermission("deposits", "edit");

  const detailRows = [
    { label: "Tenant", value: deposit.leases?.tenants?.full_name ?? "Tenant record" },
    {
      label: "Property / unit",
      value: `${deposit.leases?.units?.properties?.title ?? "Property"} · ${
        deposit.leases?.units?.unit_number ?? "Unit"
      }`,
    },
    { label: "Required amount", value: formatMoney(deposit.required_amount) },
    { label: "Amount held", value: formatMoney(withBalance.held_amount) },
    {
      label: "Outstanding",
      value:
        withBalance.outstanding_amount < 0
          ? `${formatMoney(Math.abs(withBalance.outstanding_amount))} overholding`
          : formatMoney(withBalance.outstanding_amount),
    },
    { label: "Created", value: formatDate(deposit.created_at) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/finance/deposits"
          className="text-sm text-danwell-teal hover:underline"
        >
          ← Back to deposits
        </Link>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-danwell-navy">Deposit ledger</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {deposit.leases?.tenants?.full_name ?? "Tenant"} ·{" "}
              {deposit.leases?.units?.unit_number ?? "Unit"}
            </p>
          </div>
          <Link
            href={`/dashboard/leases/${deposit.lease_id}`}
            className="inline-flex h-8 items-center rounded-lg border px-3 text-sm font-medium hover:bg-muted"
          >
            View lease
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-danwell-navy">Deposit summary</CardTitle>
          <CardDescription>
            Held amount is the signed sum of payments, refunds, deductions and adjustments.
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
          {deposit.notes ? (
            <p className="rounded-lg bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              {deposit.notes}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {canEdit ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-danwell-navy">Record a deposit transaction</CardTitle>
            <CardDescription>
              Refunds and deductions reduce the held balance. A reason is mandatory.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DepositTransactionForm
              depositId={deposit.id}
              today={new Date().toISOString().slice(0, 10)}
            />
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-danwell-navy">Transaction history</CardTitle>
            <CardDescription>{transactions.length} ledger entry(ies)</CardDescription>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No transactions recorded yet.</p>
            ) : (
              <DepositTransactionTable transactions={transactions} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-danwell-navy">Audit trail</CardTitle>
            <CardDescription>Authorized changes with actor and reason.</CardDescription>
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
