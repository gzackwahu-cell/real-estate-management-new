import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/portfolio/status-badge";
import { LeaseSummary } from "@/components/tenancy/lease-summary";
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
  APPLICATION_STATUSES,
  applicationStatusTone,
  formatDate,
  formatMoney,
  isCurrentLeaseStatus,
  isPreviousLeaseStatus,
  TENANT_STATUSES,
  tenantStatusTone,
} from "@/lib/tenancy/constants";
import { getTenantDetail } from "@/lib/tenancy/queries";

type TenantProfilePageProps = {
  params: Promise<{ id: string }>;
};

export default function TenantProfilePage({ params }: TenantProfilePageProps) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading tenant profile...</p>}>
      <TenantProfileContent params={params} />
    </Suspense>
  );
}

async function TenantProfileContent({ params }: TenantProfilePageProps) {
  const { id } = await params;
  const detail = await withPermission("tenants", "view", async (_context, supabase) =>
    getTenantDetail(supabase, id),
  );

  if (!detail) {
    notFound();
  }

  const canEdit = await hasPermission("tenants", "edit");
  const canCreateLease = await hasPermission("leases", "create");
  const canViewStatement = await hasPermission("payments", "view");
  const { tenant, leases, applications } = detail;
  const currentLeases = leases.filter((lease) => isCurrentLeaseStatus(lease.status));
  const previousLeases = leases.filter((lease) => isPreviousLeaseStatus(lease.status));
  const otherLeases = leases.filter(
    (lease) => !isCurrentLeaseStatus(lease.status) && !isPreviousLeaseStatus(lease.status),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link
            href="/dashboard/tenants"
            className="text-sm text-danwell-teal hover:underline"
          >
            ← Back to tenants
          </Link>
          <h1 className="mt-3 text-2xl font-semibold text-danwell-navy">
            {tenant.full_name}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <StatusBadge
              label={labelFor(TENANT_STATUSES, tenant.status)}
              tone={tenantStatusTone(tenant.status)}
            />
            <span className="text-sm text-muted-foreground">{tenant.phone}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {canEdit ? (
            <Link
              href={`/dashboard/tenants/${tenant.id}/edit`}
              className="inline-flex h-8 items-center rounded-lg border px-3 text-sm font-medium hover:bg-muted"
            >
              Edit profile
            </Link>
          ) : null}
          {canViewStatement ? (
            <Link
              href={`/dashboard/finance/statements?tenantId=${tenant.id}`}
              className="inline-flex h-8 items-center rounded-lg border px-3 text-sm font-medium hover:bg-muted"
            >
              Financial statement
            </Link>
          ) : null}
          {canCreateLease ? (
            <Link
              href={`/dashboard/leases/new?tenant=${tenant.id}`}
              className="inline-flex h-8 items-center rounded-lg bg-danwell-navy px-3 text-sm font-medium text-white hover:bg-danwell-navy/90"
            >
              Create lease
            </Link>
          ) : null}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-danwell-navy">Profile details</CardTitle>
          <CardDescription>Private contact and identity reference information.</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Detail label="Email" value={tenant.email || "Not provided"} />
            <Detail label="National ID / reference" value={tenant.id_reference} />
            <Detail label="Address" value={tenant.address} className="sm:col-span-2" />
            <Detail
              label="Emergency contact"
              value={
                tenant.emergency_contact_name && tenant.emergency_contact_phone
                  ? `${tenant.emergency_contact_name} · ${tenant.emergency_contact_phone}`
                  : "Not provided"
              }
              className="sm:col-span-2"
            />
            <Detail label="Registered" value={formatDate(tenant.created_at?.slice(0, 10))} />
          </dl>
        </CardContent>
      </Card>

      <LeaseSummary
        leases={currentLeases}
        title="Current leases"
        description="Active and pending lease records for this tenant."
        emptyMessage="No current leases are linked to this tenant."
      />

      <LeaseSummary
        leases={previousLeases}
        title="Previous leases"
        description="Expired and terminated lease history."
        emptyMessage="No previous leases are linked to this tenant."
      />

      {otherLeases.length > 0 ? (
        <LeaseSummary
          leases={otherLeases}
          title="Draft leases"
          description="Lease records that are not yet part of an active tenancy."
        />
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-danwell-navy">Rental applications</CardTitle>
          <CardDescription>{applications.length} application record(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {applications.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No rental applications are linked to this tenant.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="border-b text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="pb-2 font-medium">Unit</th>
                    <th className="pb-2 font-medium">Applied</th>
                    <th className="pb-2 font-medium">Proposed rent</th>
                    <th className="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map((application) => (
                    <tr key={application.id} className="border-b last:border-0">
                      <td className="py-3 pr-4">
                        <Link
                          href={`/dashboard/applications/${application.id}`}
                          className="text-danwell-navy hover:underline"
                        >
                          {application.units?.unit_number ?? "Unit record"}
                        </Link>
                      </td>
                      <td className="py-3 pr-4">{formatDate(application.application_date)}</td>
                      <td className="py-3 pr-4">{formatMoney(application.proposed_rent)}</td>
                      <td className="py-3 pr-4">
                        <StatusBadge
                          label={labelFor(APPLICATION_STATUSES, application.status)}
                          tone={applicationStatusTone(application.status)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Detail({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm text-foreground">{value}</dd>
    </div>
  );
}
