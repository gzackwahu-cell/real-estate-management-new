import { Suspense } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/portfolio/empty-state";
import { MaintenanceFiltersForm } from "@/components/maintenance/maintenance-filters";
import { MaintenanceTable } from "@/components/maintenance/maintenance-table";
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
  firstParam,
  MAINTENANCE_PRIORITIES,
  MAINTENANCE_STATUSES,
} from "@/lib/maintenance/constants";
import {
  getMaintenanceFilterOptions,
  getMaintenanceRequests,
  type MaintenanceFilters,
} from "@/lib/maintenance/queries";

type RequestsPageProps = {
  searchParams: Promise<{
    propertyId?: string | string[];
    unitId?: string | string[];
    status?: string | string[];
    priority?: string | string[];
    assignedTo?: string | string[];
  }>;
};

export default function RequestsPage({ searchParams }: RequestsPageProps) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading requests...</p>}>
      <RequestsContent searchParams={searchParams} />
    </Suspense>
  );
}

async function RequestsContent({ searchParams }: RequestsPageProps) {
  const params = await searchParams;
  const rawStatus = firstParam(params.status);
  const rawPriority = firstParam(params.priority);
  const filters: MaintenanceFilters = {
    propertyId: firstParam(params.propertyId) || undefined,
    unitId: firstParam(params.unitId) || undefined,
    status: MAINTENANCE_STATUSES.some((item) => item.value === rawStatus)
      ? rawStatus
      : undefined,
    priority: MAINTENANCE_PRIORITIES.some((item) => item.value === rawPriority)
      ? rawPriority
      : undefined,
    assignedTo: firstParam(params.assignedTo) || undefined,
  };

  const canCreate = await hasPermission("maintenance", "create");
  const data = await withPermission("maintenance", "view", async (_context, supabase) => {
    const [requests, options] = await Promise.all([
      getMaintenanceRequests(supabase, filters),
      getMaintenanceFilterOptions(supabase),
    ]);
    return { requests, options };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium tracking-[0.18em] text-danwell-teal uppercase">
            Maintenance
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-danwell-navy">Requests</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Filter by property, unit, status, priority or assigned staff.
          </p>
        </div>
        {canCreate ? (
          <Link
            href="/dashboard/maintenance/requests/new"
            className="inline-flex h-8 items-center rounded-lg bg-danwell-navy px-3 text-sm font-medium text-white hover:bg-danwell-navy/90"
          >
            New request
          </Link>
        ) : null}
      </div>

      <MaintenanceFiltersForm
        action="/dashboard/maintenance/requests"
        options={data.options}
        values={filters}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-danwell-navy">All requests</CardTitle>
          <CardDescription>{data.requests.length} matching request(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {data.requests.length === 0 ? (
            <EmptyState
              title="No matching requests"
              description="Adjust the filters or register a new maintenance request."
              href={canCreate ? "/dashboard/maintenance/requests/new" : undefined}
              actionLabel={canCreate ? "New request" : undefined}
            />
          ) : (
            <MaintenanceTable requests={data.requests} staff={data.options.staff} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
