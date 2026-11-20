import { Suspense } from "react";
import { MaintenanceRequestForm } from "@/components/maintenance/maintenance-request-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { withPermission } from "@/lib/auth/guards";
import { getMaintenanceFilterOptions } from "@/lib/maintenance/queries";

export default function NewMaintenanceRequestPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading form...</p>}>
      <NewMaintenanceRequestContent />
    </Suspense>
  );
}

async function NewMaintenanceRequestContent() {
  const options = await withPermission("maintenance", "create", async (_context, supabase) =>
    getMaintenanceFilterOptions(supabase),
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <p className="text-xs font-medium tracking-[0.18em] text-danwell-teal uppercase">
          Maintenance
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-danwell-navy">New request</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Register an issue on behalf of a tenant, or a property-level issue with no tenant.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-danwell-navy">Request details</CardTitle>
          <CardDescription>
            The request starts as submitted and enters the assignment and notification workflow.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MaintenanceRequestForm
            properties={options.properties.map((property) => ({
              id: property.id,
              label: property.title,
            }))}
            units={options.units.map((unit) => ({
              id: unit.id,
              label: `${unit.property_title} · ${unit.unit_number}`,
              propertyId: unit.property_id,
            }))}
            tenants={options.tenants.map((tenant) => ({
              id: tenant.id,
              label: tenant.phone ? `${tenant.full_name} · ${tenant.phone}` : tenant.full_name,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
