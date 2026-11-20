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
  statusFilter,
  TENANT_STATUSES,
  tenantStatusTone,
} from "@/lib/tenancy/constants";
import { getTenants } from "@/lib/tenancy/queries";

type TenantsPageProps = {
  searchParams: Promise<{ status?: string | string[] }>;
};

export default function TenantsPage({ searchParams }: TenantsPageProps) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading tenants...</p>}>
      <TenantsContent searchParams={searchParams} />
    </Suspense>
  );
}

async function TenantsContent({ searchParams }: TenantsPageProps) {
  const params = await searchParams;
  const status = statusFilter(params.status, TENANT_STATUSES);
  const tenants = await withPermission("tenants", "view", async (_context, supabase) =>
    getTenants(supabase, status),
  );
  const canCreate = await hasPermission("tenants", "create");
  const canEdit = await hasPermission("tenants", "edit");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium tracking-[0.18em] text-danwell-teal uppercase">
            Tenancy
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-danwell-navy">Tenants</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Private tenant records linked to leases and applications.
          </p>
        </div>
        {canCreate ? (
          <Button asChild>
            <Link href="/dashboard/tenants/new">Register tenant</Link>
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/dashboard/tenants"
          className={`rounded-full border px-3 py-1 text-xs ${
            status
              ? "border-border text-muted-foreground hover:bg-muted"
              : "border-danwell-navy bg-danwell-navy text-white"
          }`}
        >
          All
        </Link>
        {TENANT_STATUSES.map((option) => (
          <Link
            key={option.value}
            href={`/dashboard/tenants?status=${option.value}`}
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

      {tenants.length === 0 ? (
        <EmptyState
          title="No tenants found"
          description={
            status
              ? "No tenant records match this status filter."
              : "Register a tenant to start building lease history."
          }
          href={canCreate ? "/dashboard/tenants/new" : undefined}
          actionLabel={canCreate ? "Register tenant" : undefined}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-danwell-navy">
              Registered tenants
            </CardTitle>
            <CardDescription>{tenants.length} tenant record(s)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-sm">
                <thead className="border-b text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="pb-2 font-medium">Tenant</th>
                    <th className="pb-2 font-medium">Phone</th>
                    <th className="pb-2 font-medium">Email</th>
                    <th className="pb-2 font-medium">Registered</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tenants.map((tenant) => (
                    <tr key={tenant.id} className="border-b last:border-0">
                      <td className="py-3 pr-4 font-medium">
                        <Link
                          href={`/dashboard/tenants/${tenant.id}`}
                          className="text-danwell-navy hover:underline"
                        >
                          {tenant.full_name}
                        </Link>
                      </td>
                      <td className="py-3 pr-4">{tenant.phone}</td>
                      <td className="py-3 pr-4">{tenant.email || "—"}</td>
                      <td className="py-3 pr-4">{formatDate(tenant.created_at?.slice(0, 10))}</td>
                      <td className="py-3 pr-4">
                        <StatusBadge
                          label={labelFor(TENANT_STATUSES, tenant.status)}
                          tone={tenantStatusTone(tenant.status)}
                        />
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Link
                            href={`/dashboard/tenants/${tenant.id}`}
                            className="rounded-lg border px-2.5 py-1 text-xs hover:bg-muted"
                          >
                            View
                          </Link>
                          {canEdit ? (
                            <Link
                              href={`/dashboard/tenants/${tenant.id}/edit`}
                              className="rounded-lg border px-2.5 py-1 text-xs hover:bg-muted"
                            >
                              Edit
                            </Link>
                          ) : null}
                        </div>
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
