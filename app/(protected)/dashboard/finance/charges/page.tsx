import { Suspense } from "react";
import { EmptyState } from "@/components/portfolio/empty-state";
import { ChargeTable } from "@/components/finance/finance-tables";
import { FinanceFilters } from "@/components/finance/finance-filters";
import { GenerateChargesForm } from "@/components/finance/generate-charges-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { hasPermission } from "@/lib/auth/dal";
import { withPermission } from "@/lib/auth/guards";
import { currentPeriod, firstParam, isPeriod } from "@/lib/finance/constants";
import {
  getFinanceFilterOptions,
  getFinanceLedger,
  type FinanceFilters as FinanceFilterValues,
} from "@/lib/finance/queries";

type ChargesPageProps = {
  searchParams: Promise<{
    period?: string | string[];
    propertyId?: string | string[];
    unitId?: string | string[];
    tenantId?: string | string[];
  }>;
};

export default function ChargesPage({ searchParams }: ChargesPageProps) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading charges...</p>}>
      <ChargesContent searchParams={searchParams} />
    </Suspense>
  );
}

async function ChargesContent({ searchParams }: ChargesPageProps) {
  const params = await searchParams;
  const period = firstParam(params.period);
  const filters: FinanceFilterValues = {
    period: period && isPeriod(period) ? period : undefined,
    propertyId: firstParam(params.propertyId) || undefined,
    unitId: firstParam(params.unitId) || undefined,
    tenantId: firstParam(params.tenantId) || undefined,
  };

  const { ledger, options } = await withPermission("rent", "view", async (_context, supabase) => {
    const [ledgerData, filterOptions] = await Promise.all([
      getFinanceLedger(supabase, filters),
      getFinanceFilterOptions(supabase),
    ]);
    return { ledger: ledgerData, options: filterOptions };
  });

  const canGenerate = await hasPermission("rent", "create");

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium tracking-[0.18em] text-danwell-teal uppercase">
          Rent billing
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-danwell-navy">Rent charges</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Monthly charges, effective amounts and outstanding balances. Balances are calculated
          from the allocation ledger.
        </p>
      </div>

      <FinanceFilters action="/dashboard/finance/charges" options={options} values={filters} />

      {canGenerate ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-danwell-navy">Generate a month&apos;s charges</CardTitle>
            <CardDescription>
              Idempotent generation for active leases. Existing charges are never changed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <GenerateChargesForm defaultPeriod={filters.period ?? currentPeriod()} />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-danwell-navy">Charges</CardTitle>
          <CardDescription>{ledger.charges.length} rent charge(s) in scope</CardDescription>
        </CardHeader>
        <CardContent>
          {ledger.charges.length === 0 ? (
            <EmptyState
              title="No charges found"
              description="Adjust the filters or generate charges for a rental period."
            />
          ) : (
            <ChargeTable charges={ledger.charges} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
