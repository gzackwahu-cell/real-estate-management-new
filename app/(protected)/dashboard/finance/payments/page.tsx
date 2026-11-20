import { Suspense } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/portfolio/empty-state";
import { FinanceFilters } from "@/components/finance/finance-filters";
import { PaymentTable } from "@/components/finance/finance-tables";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { hasPermission } from "@/lib/auth/dal";
import { withPermission } from "@/lib/auth/guards";
import { firstParam, isPeriod } from "@/lib/finance/constants";
import {
  getFinanceFilterOptions,
  getFinanceLedger,
  type FinanceFilters as FinanceFilterValues,
} from "@/lib/finance/queries";

type PaymentsPageProps = {
  searchParams: Promise<{
    period?: string | string[];
    propertyId?: string | string[];
    unitId?: string | string[];
    tenantId?: string | string[];
  }>;
};

export default function PaymentsPage({ searchParams }: PaymentsPageProps) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading payments...</p>}>
      <PaymentsContent searchParams={searchParams} />
    </Suspense>
  );
}

async function PaymentsContent({ searchParams }: PaymentsPageProps) {
  const params = await searchParams;
  const period = firstParam(params.period);
  const filters: FinanceFilterValues = {
    period: period && isPeriod(period) ? period : undefined,
    propertyId: firstParam(params.propertyId) || undefined,
    unitId: firstParam(params.unitId) || undefined,
    tenantId: firstParam(params.tenantId) || undefined,
  };

  const { ledger, options } = await withPermission(
    "payments",
    "view",
    async (_context, supabase) => {
      const [ledgerData, filterOptions] = await Promise.all([
        getFinanceLedger(supabase, filters),
        getFinanceFilterOptions(supabase),
      ]);
      return { ledger: ledgerData, options: filterOptions };
    },
  );

  const canRecord = await hasPermission("payments", "create");
  const unallocated = ledger.payments
    .filter((payment) => payment.unallocated_amount > 0)
    .reduce((total, payment) => total + payment.unallocated_amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium tracking-[0.18em] text-danwell-teal uppercase">
            Collections
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-danwell-navy">Payments</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manual rent and deposit payments. Confirmed payments are immutable; corrections
            are recorded as reversals.
          </p>
        </div>
        {canRecord ? (
          <Link
            href="/dashboard/finance/payments/new"
            className="inline-flex h-8 items-center rounded-lg bg-danwell-navy px-3 text-sm font-medium text-white hover:bg-danwell-navy/90"
          >
            Record payment
          </Link>
        ) : null}
      </div>

      <FinanceFilters action="/dashboard/finance/payments" options={options} values={filters} />

      {unallocated > 0 ? (
        <div className="rounded-lg border border-amber-600/20 bg-amber-600/10 px-4 py-3 text-sm text-amber-800">
          {ledger.payments.filter((payment) => payment.unallocated_amount > 0).length} rent
          payment(s) have unallocated credit in this scope. Open a payment to allocate it to
          outstanding charges.
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-danwell-navy">Payment history</CardTitle>
          <CardDescription>{ledger.payments.length} payment(s) in scope</CardDescription>
        </CardHeader>
        <CardContent>
          {ledger.payments.length === 0 ? (
            <EmptyState
              title="No payments found"
              description="Adjust the filters or record a new payment."
            />
          ) : (
            <PaymentTable payments={ledger.payments} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
