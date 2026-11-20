import { Suspense } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/portfolio/empty-state";
import {
  ChargeTable,
  DepositTable,
  PaymentTable,
  ReceiptTable,
} from "@/components/finance/finance-tables";
import { FinanceFilters } from "@/components/finance/finance-filters";
import { GenerateChargesForm } from "@/components/finance/generate-charges-form";
import { SummaryCards } from "@/components/finance/summary-cards";
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
  currentPeriod,
  firstParam,
  formatPeriod,
  isPeriod,
} from "@/lib/finance/constants";
import {
  getFinanceDashboard,
  getFinanceFilterOptions,
  type FinanceFilters as FinanceFilterValues,
} from "@/lib/finance/queries";

type FinancePageProps = {
  searchParams: Promise<{
    period?: string | string[];
    propertyId?: string | string[];
    unitId?: string | string[];
    tenantId?: string | string[];
  }>;
};

export default function FinancePage({ searchParams }: FinancePageProps) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading finance...</p>}>
      <FinanceContent searchParams={searchParams} />
    </Suspense>
  );
}

async function FinanceContent({ searchParams }: FinancePageProps) {
  const params = await searchParams;
  const period = firstParam(params.period);
  const filters: FinanceFilterValues = {
    period: period && isPeriod(period) ? period : undefined,
    propertyId: firstParam(params.propertyId) || undefined,
    unitId: firstParam(params.unitId) || undefined,
    tenantId: firstParam(params.tenantId) || undefined,
  };

  const { dashboard, options } = await withPermission("payments", "view", async (_context, supabase) => {
    const [summary, filterOptions] = await Promise.all([
      getFinanceDashboard(supabase, filters),
      getFinanceFilterOptions(supabase),
    ]);
    return { dashboard: summary, options: filterOptions };
  });

  const canRecordPayment = await hasPermission("payments", "create");
  const canGenerateCharges = await hasPermission("rent", "create");
  const { summary, ledger } = dashboard;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium tracking-[0.18em] text-danwell-teal uppercase">
            Rent and financial management
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-danwell-navy">Finance</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Billing, collections, deposits and receipts for {formatPeriod(filters.period)}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canRecordPayment ? (
            <Link
              href="/dashboard/finance/payments/new"
              className="inline-flex h-8 items-center rounded-lg bg-danwell-navy px-3 text-sm font-medium text-white hover:bg-danwell-navy/90"
            >
              Record payment
            </Link>
          ) : null}
          <Link
            href="/dashboard/finance/statements"
            className="inline-flex h-8 items-center rounded-lg border px-3 text-sm font-medium hover:bg-muted"
          >
            Statements
          </Link>
          <Link
            href="/dashboard/finance/receipts"
            className="inline-flex h-8 items-center rounded-lg border px-3 text-sm font-medium hover:bg-muted"
          >
            Receipts
          </Link>
        </div>
      </div>

      <FinanceFilters action="/dashboard/finance" options={options} values={filters} />

      <SummaryCards summary={summary} period={filters.period} />

      {canGenerateCharges ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-danwell-navy">Generate rent charges</CardTitle>
            <CardDescription>
              Creates monthly charges for active leases. Re-running a month never duplicates
              or overwrites existing charges.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <GenerateChargesForm defaultPeriod={filters.period ?? currentPeriod()} />
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg text-danwell-navy">Recent rent charges</CardTitle>
              <CardDescription>{ledger.charges.length} charge(s) in scope</CardDescription>
            </div>
            <Link
              href="/dashboard/finance/charges"
              className="shrink-0 text-sm text-danwell-teal hover:underline"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {ledger.charges.length === 0 ? (
              <EmptyState
                title="No rent charges"
                description="Generate monthly charges for active leases to see them here."
              />
            ) : (
              <ChargeTable charges={ledger.charges} limit={8} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg text-danwell-navy">Recent payments</CardTitle>
              <CardDescription>{ledger.payments.length} payment(s) in scope</CardDescription>
            </div>
            <Link
              href="/dashboard/finance/payments"
              className="shrink-0 text-sm text-danwell-teal hover:underline"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {ledger.payments.length === 0 ? (
              <EmptyState
                title="No payments recorded"
                description="Record a rent or deposit payment to see it here."
              />
            ) : (
              <PaymentTable payments={ledger.payments} limit={8} />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg text-danwell-navy">Deposit balances</CardTitle>
              <CardDescription>Required amounts are tracked separately from rent.</CardDescription>
            </div>
            <Link
              href="/dashboard/finance/deposits"
              className="shrink-0 text-sm text-danwell-teal hover:underline"
            >
              Manage
            </Link>
          </CardHeader>
          <CardContent>
            {ledger.deposits.length === 0 ? (
              <EmptyState
                title="No deposit records"
                description="Create a deposit record from a lease when one is required."
              />
            ) : (
              <DepositTable deposits={ledger.deposits} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg text-danwell-navy">Latest receipts</CardTitle>
              <CardDescription>Printable, numbered proof of payment.</CardDescription>
            </div>
            <Link
              href="/dashboard/finance/receipts"
              className="shrink-0 text-sm text-danwell-teal hover:underline"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {ledger.receipts.length === 0 ? (
              <EmptyState
                title="No receipts issued"
                description="Receipts are issued automatically when a payment is recorded."
              />
            ) : (
              <ReceiptTable receipts={ledger.receipts.slice(0, 8)} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
