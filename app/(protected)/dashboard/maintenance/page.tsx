import { Suspense } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/portfolio/empty-state";
import { ExpenseTable } from "@/components/maintenance/expense-table";
import { MaintenanceFiltersForm } from "@/components/maintenance/maintenance-filters";
import { MaintenanceNotifications } from "@/components/maintenance/maintenance-notifications";
import { MaintenanceSummaryCards } from "@/components/maintenance/maintenance-summary-cards";
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
  getMaintenanceExpenses,
  getMaintenanceFilterOptions,
  getMaintenanceNotifications,
  getMaintenanceRequests,
  getMaintenanceSummary,
  type MaintenanceFilters,
} from "@/lib/maintenance/queries";

type MaintenancePageProps = {
  searchParams: Promise<{
    propertyId?: string | string[];
    unitId?: string | string[];
    status?: string | string[];
    priority?: string | string[];
    assignedTo?: string | string[];
  }>;
};

export default function MaintenancePage({ searchParams }: MaintenancePageProps) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading maintenance...</p>}>
      <MaintenanceContent searchParams={searchParams} />
    </Suspense>
  );
}

async function MaintenanceContent({ searchParams }: MaintenancePageProps) {
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
  const canViewExpenses = await hasPermission("expenses", "view");

  const data = await withPermission("maintenance", "view", async (_context, supabase) => {
    const [summary, requests, options, notifications, expenses] = await Promise.all([
      getMaintenanceSummary(supabase, filters),
      getMaintenanceRequests(supabase, filters),
      getMaintenanceFilterOptions(supabase),
      getMaintenanceNotifications(supabase),
      canViewExpenses
        ? getMaintenanceExpenses(supabase, filters.propertyId ? { propertyId: filters.propertyId } : {})
        : Promise.resolve([]),
    ]);
    return { summary, requests, options, notifications, expenses };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium tracking-[0.18em] text-danwell-teal uppercase">
            Repairs and maintenance
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-danwell-navy">Maintenance</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Requests, assignments, progress and repair costs in one operational view.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canCreate ? (
            <Link
              href="/dashboard/maintenance/requests/new"
              className="inline-flex h-8 items-center rounded-lg bg-danwell-navy px-3 text-sm font-medium text-white hover:bg-danwell-navy/90"
            >
              New request
            </Link>
          ) : null}
          <Link
            href="/dashboard/maintenance/requests"
            className="inline-flex h-8 items-center rounded-lg border px-3 text-sm font-medium hover:bg-muted"
          >
            All requests
          </Link>
          {canViewExpenses ? (
            <Link
              href="/dashboard/maintenance/expenses"
              className="inline-flex h-8 items-center rounded-lg border px-3 text-sm font-medium hover:bg-muted"
            >
              Expenses
            </Link>
          ) : null}
        </div>
      </div>

      <MaintenanceFiltersForm action="/dashboard/maintenance" options={data.options} values={filters} />

      <MaintenanceSummaryCards summary={data.summary} />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg text-danwell-navy">Recent requests</CardTitle>
              <CardDescription>{data.requests.length} request(s) in scope</CardDescription>
            </div>
            <Link
              href="/dashboard/maintenance/requests"
              className="shrink-0 text-sm text-danwell-teal hover:underline"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {data.requests.length === 0 ? (
              <EmptyState
                title="No maintenance requests"
                description="Register a request or adjust the filters to see more records."
                href={canCreate ? "/dashboard/maintenance/requests/new" : undefined}
                actionLabel={canCreate ? "New request" : undefined}
              />
            ) : (
              <MaintenanceTable
                requests={data.requests}
                staff={data.options.staff}
                limit={8}
              />
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-danwell-navy">Notifications</CardTitle>
              <CardDescription>Prepared in-app records for maintenance events.</CardDescription>
            </CardHeader>
            <CardContent>
              <MaintenanceNotifications notifications={data.notifications} />
            </CardContent>
          </Card>

          {canViewExpenses ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-danwell-navy">Recent expenses</CardTitle>
                <CardDescription>Repair costs are kept separate from rent.</CardDescription>
              </CardHeader>
              <CardContent>
                {data.expenses.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No maintenance expenses recorded.</p>
                ) : (
                  <ExpenseTable expenses={data.expenses} limit={5} showEdit={false} />
                )}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
