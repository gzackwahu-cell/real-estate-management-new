import { Suspense } from "react";
import { EmptyState } from "@/components/portfolio/empty-state";
import { FinanceFilters } from "@/components/finance/finance-filters";
import { ReceiptTable } from "@/components/finance/finance-tables";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { withPermission } from "@/lib/auth/guards";
import { firstParam, isPeriod } from "@/lib/finance/constants";
import {
  getFinanceFilterOptions,
  getReceipts,
  type FinanceFilters as FinanceFilterValues,
} from "@/lib/finance/queries";

type ReceiptsPageProps = {
  searchParams: Promise<{
    period?: string | string[];
    propertyId?: string | string[];
    unitId?: string | string[];
    tenantId?: string | string[];
  }>;
};

export default function ReceiptsPage({ searchParams }: ReceiptsPageProps) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading receipts...</p>}>
      <ReceiptsContent searchParams={searchParams} />
    </Suspense>
  );
}

async function ReceiptsContent({ searchParams }: ReceiptsPageProps) {
  const params = await searchParams;
  const period = firstParam(params.period);
  const filters: FinanceFilterValues = {
    period: period && isPeriod(period) ? period : undefined,
    propertyId: firstParam(params.propertyId) || undefined,
    unitId: firstParam(params.unitId) || undefined,
    tenantId: firstParam(params.tenantId) || undefined,
  };

  const { receipts, options } = await withPermission(
    "payments",
    "view",
    async (_context, supabase) => {
      const [receiptData, filterOptions] = await Promise.all([
        getReceipts(supabase, filters),
        getFinanceFilterOptions(supabase),
      ]);
      return { receipts: receiptData, options: filterOptions };
    },
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium tracking-[0.18em] text-danwell-teal uppercase">
          Proof of payment
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-danwell-navy">Receipts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Numbered receipts are issued for recorded payments and are restricted to scoped
          staff and the linked tenant.
        </p>
      </div>

      <FinanceFilters action="/dashboard/finance/receipts" options={options} values={filters} />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-danwell-navy">Issued receipts</CardTitle>
          <CardDescription>{receipts.length} receipt(s) in scope</CardDescription>
        </CardHeader>
        <CardContent>
          {receipts.length === 0 ? (
            <EmptyState
              title="No receipts found"
              description="Adjust the filters or record a payment to issue a receipt."
            />
          ) : (
            <ReceiptTable receipts={receipts} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
