import { Suspense } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/portfolio/empty-state";
import { CreateDepositForm } from "@/components/finance/create-deposit-form";
import { DepositTable } from "@/components/finance/finance-tables";
import { FinanceFilters } from "@/components/finance/finance-filters";
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
  getLeaseOptions,
  type FinanceFilters as FinanceFilterValues,
} from "@/lib/finance/queries";

type DepositsPageProps = {
  searchParams: Promise<{
    period?: string | string[];
    propertyId?: string | string[];
    unitId?: string | string[];
    tenantId?: string | string[];
    lease?: string | string[];
  }>;
};

export default function DepositsPage({ searchParams }: DepositsPageProps) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading deposits...</p>}>
      <DepositsContent searchParams={searchParams} />
    </Suspense>
  );
}

async function DepositsContent({ searchParams }: DepositsPageProps) {
  const params = await searchParams;
  const period = firstParam(params.period);
  const requestedLease = firstParam(params.lease);
  const filters: FinanceFilterValues = {
    period: period && isPeriod(period) ? period : undefined,
    propertyId: firstParam(params.propertyId) || undefined,
    unitId: firstParam(params.unitId) || undefined,
    tenantId: firstParam(params.tenantId) || undefined,
  };

  const { ledger, options, leases } = await withPermission(
    "deposits",
    "view",
    async (_context, supabase) => {
      const [ledgerData, filterOptions, leaseRows] = await Promise.all([
        getFinanceLedger(supabase, filters),
        getFinanceFilterOptions(supabase),
        getLeaseOptions(supabase),
      ]);
      return { ledger: ledgerData, options: filterOptions, leases: leaseRows };
    },
  );

  const canCreate = await hasPermission("deposits", "create");
  const depositsByLease = new Set(ledger.deposits.map((deposit) => deposit.lease_id));
  const leasesWithoutDeposits = leases.filter(
    (lease) => !depositsByLease.has(lease.id) && Boolean(lease.tenants),
  );
  const preselected = leasesWithoutDeposits.filter((lease) => lease.id === requestedLease);
  const creationCandidates = (preselected.length > 0
    ? preselected
    : leasesWithoutDeposits
  ).slice(0, 6);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium tracking-[0.18em] text-danwell-teal uppercase">
          Tenant funds
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-danwell-navy">Deposits</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Required amounts, amounts held and signed transactions. Deposits are never mixed
          with rent income.
        </p>
      </div>

      <FinanceFilters action="/dashboard/finance/deposits" options={options} values={filters} />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-danwell-navy">Deposit records</CardTitle>
          <CardDescription>{ledger.deposits.length} deposit(s) in scope</CardDescription>
        </CardHeader>
        <CardContent>
          {ledger.deposits.length === 0 ? (
            <EmptyState
              title="No deposits found"
              description="Create a deposit record for a lease or adjust the filters."
            />
          ) : (
            <DepositTable deposits={ledger.deposits} />
          )}
        </CardContent>
      </Card>

      {canCreate && creationCandidates.length > 0 ? (
        <Card id="create-deposit">
          <CardHeader>
            <CardTitle className="text-lg text-danwell-navy">Create a deposit record</CardTitle>
            <CardDescription>
              Set the required amount for a lease. The amount defaults to the lease deposit
              amount.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {creationCandidates.map((lease) => (
              <div
                key={lease.id}
                className="rounded-lg border border-danwell-teal/15 bg-danwell-teal/5 px-4 py-4"
              >
                <p className="mb-4 text-sm font-medium text-danwell-navy">
                  {lease.tenants?.full_name ?? "Tenant"} ·{" "}
                  {lease.units?.unit_number ?? "Unit"} ·{" "}
                  {lease.units?.properties?.title ?? "Property"}
                </p>
                <CreateDepositForm
                  leaseId={lease.id}
                  defaultRequiredAmount={lease.deposit_amount ?? lease.monthly_rent}
                />
              </div>
            ))}
            {leasesWithoutDeposits.length > creationCandidates.length ? (
              <p className="text-xs text-muted-foreground">
                Showing {creationCandidates.length} of {leasesWithoutDeposits.length} leases
                without a deposit record. Open a lease to create one for the rest.
              </p>
            ) : null}
            <p className="text-xs text-muted-foreground">
              Need a different lease?{" "}
              <Link href="/dashboard/leases" className="text-danwell-teal hover:underline">
                Browse leases
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
