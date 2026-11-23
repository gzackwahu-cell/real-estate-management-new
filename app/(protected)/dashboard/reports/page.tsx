import { Suspense } from "react";
import { PageHeader } from "@/components/admin/page-header";
import { ReportFiltersForm } from "@/components/dashboard/reports/report-filters";
import { ReportsOverview } from "@/components/dashboard/reports/reports-overview";
import { DashboardSkeleton } from "@/components/ui/skeleton";
import { withPermission } from "@/lib/auth/guards";
import {
  getReportSnapshot,
  parseReportFilters,
} from "@/lib/reports/queries";

type ReportsPageProps = {
  searchParams: Promise<{
    period?: string | string[];
    propertyId?: string | string[];
  }>;
};

export default function ReportsPage({ searchParams }: ReportsPageProps) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <ReportsContent searchParams={searchParams} />
    </Suspense>
  );
}

async function ReportsContent({ searchParams }: ReportsPageProps) {
  const filters = parseReportFilters(await searchParams);
  const report = await withPermission("reports", "view", async (_context, supabase) =>
    getReportSnapshot(supabase, filters),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Insights"
        title="Reports"
        description="A compact overview assembled from existing finance, portfolio, tenancy, maintenance and listing records."
      />
      <ReportFiltersForm
        filters={report.filters}
        propertyOptions={report.propertyOptions}
      />
      <ReportsOverview report={report} />
    </div>
  );
}
