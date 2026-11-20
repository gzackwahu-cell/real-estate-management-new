import { Suspense } from "react";
import Link from "next/link";
import { MaintenanceTable } from "@/components/maintenance/maintenance-table";
import { PortalLoading } from "@/components/portal/portal-loading";
import { PortalPageHeader } from "@/components/portal/portal-page-header";
import { PortalStatCard } from "@/components/portal/portal-stat-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { withRoles } from "@/lib/auth/guards";
import { ROLES } from "@/lib/auth/roles";
import { firstParam } from "@/lib/tenancy/constants";
import { loadOwnerPortal } from "@/lib/portal/owner";

type OwnerMaintenancePageProps = {
  searchParams: Promise<{ propertyId?: string | string[] }>;
};

export default function OwnerMaintenancePage({
  searchParams,
}: OwnerMaintenancePageProps) {
  return (
    <Suspense fallback={<PortalLoading label="Loading maintenance requests..." />}>
      <OwnerMaintenanceContent searchParams={searchParams} />
    </Suspense>
  );
}

async function OwnerMaintenanceContent({ searchParams }: OwnerMaintenancePageProps) {
  const requestedPropertyId = firstParam((await searchParams).propertyId);

  const data = await withRoles(
    [ROLES.OWNER, ROLES.SUPER_ADMIN, ROLES.ADMIN],
    (_context, supabase) => loadOwnerPortal(supabase, _context.userId),
  );

  const propertyId =
    requestedPropertyId &&
    data.properties.some((property) => property.id === requestedPropertyId)
      ? requestedPropertyId
      : undefined;
  const selected = data.properties.find((property) => property.id === propertyId);
  const requests = propertyId
    ? data.maintenance.filter(
        (request) => request.property_id === propertyId,
      )
    : data.maintenance;
  const open = requests.filter(
    (request) => request.status !== "completed" && request.status !== "cancelled",
  ).length;
  const completed = requests.filter(
    (request) => request.status === "completed",
  ).length;

  return (
    <div className="space-y-6">
      <PortalPageHeader
        eyebrow="Owner maintenance"
        title="Maintenance progress"
        description="Follow requests reported for your properties. Expenses and internal work notes remain staff-only."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <PortalStatCard label="Requests" value={requests.length} accent="navy" />
        <PortalStatCard label="Open" value={open} accent="gold" />
        <PortalStatCard label="Completed" value={completed} accent="teal" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-danwell-navy">Filter by property</CardTitle>
          <CardDescription>
            {selected
              ? `Showing requests for ${selected.title}.`
              : "Showing requests across all verified properties."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Link
            href="/owner/maintenance"
            className={`inline-flex h-8 items-center rounded-lg border px-3 text-sm font-medium ${
              propertyId
                ? "text-danwell-navy hover:bg-muted"
                : "border-danwell-navy bg-danwell-navy text-white"
            }`}
          >
            All properties
          </Link>
          {data.properties.map((property) => (
            <Link
              key={property.id}
              href={`/owner/maintenance?propertyId=${property.id}`}
              className={`inline-flex h-8 items-center rounded-lg border px-3 text-sm font-medium ${
                propertyId === property.id
                  ? "border-danwell-navy bg-danwell-navy text-white"
                  : "text-danwell-navy hover:bg-muted"
              }`}
            >
              {property.title}
            </Link>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-danwell-navy">Requests</CardTitle>
          <CardDescription>
            Select a request to see status updates and progress history.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No maintenance requests have been reported for this selection.
            </p>
          ) : (
            <MaintenanceTable requests={requests} hrefBase="/owner/maintenance" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
