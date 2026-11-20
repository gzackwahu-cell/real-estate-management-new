import { Suspense } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/portfolio/empty-state";
import { StatusBadge } from "@/components/portfolio/status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { hasPermission } from "@/lib/auth/dal";
import { withPermission } from "@/lib/auth/guards";
import { labelFor } from "@/lib/portfolio/constants";
import {
  formatDate,
  formatMoney,
  LEASE_STATUSES,
  leaseStatusTone,
  statusFilter,
} from "@/lib/tenancy/constants";
import { getLeases } from "@/lib/tenancy/queries";

type LeasesPageProps = {
  searchParams: Promise<{ status?: string | string[] }>;
};

export default function LeasesPage({ searchParams }: LeasesPageProps) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading leases...</p>}>
      <LeasesContent searchParams={searchParams} />
    </Suspense>
  );
}

async function LeasesContent({ searchParams }: LeasesPageProps) {
  const params = await searchParams;
  const status = statusFilter(params.status, LEASE_STATUSES);
  const leases = await withPermission("leases", "view", async (_context, supabase) =>
    getLeases(supabase, status),
  );
  const canCreate = await hasPermission("leases", "create");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium tracking-[0.18em] text-danwell-teal uppercase">
            Tenancy
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-danwell-navy">Leases</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Active tenancies, drafts, renewals and lease history.
          </p>
        </div>
        {canCreate ? (
          <Button asChild>
            <Link href="/dashboard/leases/new">New lease</Link>
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/dashboard/leases"
          className={`rounded-full border px-3 py-1 text-xs ${
            status
              ? "border-border text-muted-foreground hover:bg-muted"
              : "border-danwell-navy bg-danwell-navy text-white"
          }`}
        >
          All
        </Link>
        {LEASE_STATUSES.map((option) => (
          <Link
            key={option.value}
            href={`/dashboard/leases?status=${option.value}`}
            className={`rounded-full border px-3 py-1 text-xs ${
              status === option.value
                ? "border-danwell-navy bg-danwell-navy text-white"
                : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            {option.label}
          </Link>
        ))}
      </div>

      {leases.length === 0 ? (
        <EmptyState
          title="No leases found"
          description={
            status
              ? "No leases match this status filter."
              : "Create a lease to link a tenant to a rental unit."
          }
          href={canCreate ? "/dashboard/leases/new" : undefined}
          actionLabel={canCreate ? "New lease" : undefined}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-danwell-navy">Lease register</CardTitle>
            <CardDescription>{leases.length} lease record(s)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-sm">
                <thead className="border-b text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="pb-2 font-medium">Tenant</th>
                    <th className="pb-2 font-medium">Unit / property</th>
                    <th className="pb-2 font-medium">Dates</th>
                    <th className="pb-2 font-medium">Monthly rent</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {leases.map((lease) => (
                    <tr key={lease.id} className="border-b last:border-0">
                      <td className="py-3 pr-4 font-medium">
                        {lease.tenants?.full_name ?? "Tenant record"}
                      </td>
                      <td className="py-3 pr-4">
                        {lease.units?.unit_number ?? "Unit record"}
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {lease.units?.properties?.title ?? "Property record"}
                        </p>
                      </td>
                      <td className="py-3 pr-4">
                        {formatDate(lease.start_date)} – {formatDate(lease.end_date)}
                      </td>
                      <td className="py-3 pr-4">{formatMoney(lease.monthly_rent)}</td>
                      <td className="py-3 pr-4">
                        <StatusBadge
                          label={labelFor(LEASE_STATUSES, lease.status)}
                          tone={leaseStatusTone(lease.status)}
                        />
                      </td>
                      <td className="py-3 text-right">
                        <Link
                          href={`/dashboard/leases/${lease.id}`}
                          className="rounded-lg border px-2.5 py-1 text-xs hover:bg-muted"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
