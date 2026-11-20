import { Suspense } from "react";
import Link from "next/link";
import { MaintenanceNotifications } from "@/components/maintenance/maintenance-notifications";
import { MaintenanceRequestForm } from "@/components/maintenance/maintenance-request-form";
import { MaintenanceTable } from "@/components/maintenance/maintenance-table";
import { EmptyState } from "@/components/portfolio/empty-state";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { withRoles } from "@/lib/auth/guards";
import { ROLES } from "@/lib/auth/roles";
import {
  getMaintenanceNotifications,
  getMaintenanceRequests,
} from "@/lib/maintenance/queries";
import type {
  MaintenanceNotification,
  MaintenanceRecord,
} from "@/lib/maintenance/validation";
import { getTenantPortalData } from "@/lib/tenancy/queries";
import type { LeaseRecord } from "@/lib/tenancy/validation";

export default function TenantMaintenancePage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading maintenance...</p>}>
      <TenantMaintenanceContent />
    </Suspense>
  );
}

type PropertyOption = { id: string; label: string };
type UnitOption = { id: string; label: string; propertyId: string };

function optionsFromLeases(leases: LeaseRecord[]) {
  const propertyMap = new Map<string, PropertyOption>();
  const unitMap = new Map<string, UnitOption>();

  for (const lease of leases) {
    const unit = lease.units;
    if (!unit) continue;

    const propertyId = unit.property_id;
    const propertyTitle = unit.properties?.title ?? "Your property";
    if (!propertyMap.has(propertyId)) {
      propertyMap.set(propertyId, { id: propertyId, label: propertyTitle });
    }
    if (!unitMap.has(unit.id)) {
      unitMap.set(unit.id, {
        id: unit.id,
        label: `${propertyTitle} · ${unit.unit_number}`,
        propertyId,
      });
    }
  }

  return {
    properties: Array.from(propertyMap.values()),
    units: Array.from(unitMap.values()),
  };
}

async function TenantMaintenanceContent() {
  const data = await withRoles(
    [ROLES.TENANT, ROLES.SUPER_ADMIN, ROLES.ADMIN],
    async (_context, supabase) => {
      const portal = await getTenantPortalData(supabase, _context.userId);
      if (!portal) {
        return null;
      }

      // Maintenance tables are introduced by prepared migrations. Keep the
      // tenancy portal usable if those migrations have not been applied yet.
      let requests: MaintenanceRecord[] = [];
      let notifications: MaintenanceNotification[] = [];
      try {
        requests = await getMaintenanceRequests(supabase, { tenantId: portal.tenant.id });
      } catch {
        requests = [];
      }
      try {
        notifications = await getMaintenanceNotifications(supabase);
      } catch {
        notifications = [];
      }

      return { ...portal, requests, notifications };
    },
  );

  if (!data) {
    return (
      <Card className="border-dashed border-danwell-navy/20">
        <CardContent className="px-4 py-8 text-center">
          <p className="font-medium text-danwell-navy">No tenancy profile linked</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Maintenance reporting is available once your tenant profile is linked.
          </p>
        </CardContent>
      </Card>
    );
  }

  const options = optionsFromLeases(data.leases);
  const fixedProperty =
    options.properties.length === 1 ? options.properties[0] : undefined;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium tracking-[0.18em] text-danwell-teal uppercase">
            My tenancy
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-danwell-navy">Maintenance</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Report an issue and follow updates on your own requests only.
          </p>
        </div>
        <Link
          href="/tenant"
          className="inline-flex h-8 items-center rounded-lg border px-3 text-sm font-medium hover:bg-muted"
        >
          Back to tenancy
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg text-danwell-navy">Report an issue</CardTitle>
            <CardDescription>
              Linked to your tenancy. Staff assignments and work notes are visible on each request.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {options.properties.length === 0 ? (
              <EmptyState
                title="No linked property"
                description="A property and unit become available once your lease is recorded."
              />
            ) : (
              <MaintenanceRequestForm
                properties={options.properties}
                units={options.units}
                tenants={[]}
                fixedProperty={fixedProperty}
                fixedTenant={{
                  id: data.tenant.id,
                  label: data.tenant.full_name,
                }}
                fixedTenantContact={data.tenant.phone || data.tenant.email || ""}
                portal
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-danwell-navy">Notifications</CardTitle>
            <CardDescription>Maintenance events prepared for your account.</CardDescription>
          </CardHeader>
          <CardContent>
            <MaintenanceNotifications notifications={data.notifications} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-danwell-navy">My requests</CardTitle>
          <CardDescription>{data.requests.length} request(s) reported by you.</CardDescription>
        </CardHeader>
        <CardContent>
          {data.requests.length === 0 ? (
            <EmptyState
              title="No maintenance requests"
              description="Use the form above to report your first issue."
            />
          ) : (
            <MaintenanceTable requests={data.requests} tenantView />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
