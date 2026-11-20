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
import {
  PROPERTY_STATUSES,
  PROPERTY_TYPES,
  labelFor,
} from "@/lib/portfolio/constants";
import { getProperties } from "@/lib/portfolio/queries";

export default function PropertiesPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading properties...</p>}>
      <PropertiesContent />
    </Suspense>
  );
}

async function PropertiesContent() {
  const properties = await withPermission(
    "properties",
    "view",
    async (_context, supabase) => getProperties(supabase),
  );
  const canCreate = await hasPermission("properties", "create");
  const canEdit = await hasPermission("properties", "edit");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium tracking-[0.18em] text-danwell-teal uppercase">
            Portfolio
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-danwell-navy">
            Properties
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage the managed property portfolio and its ownership records.
          </p>
        </div>
        {canCreate ? (
          <Button asChild>
            <Link href="/dashboard/properties/new">Register property</Link>
          </Button>
        ) : null}
      </div>

      {properties.length === 0 ? (
        <EmptyState
          title="No properties yet"
          description="Register a property and link it to one or more owners."
          href={canCreate ? "/dashboard/properties/new" : undefined}
          actionLabel={canCreate ? "Register property" : undefined}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-danwell-navy">
              Registered properties
            </CardTitle>
            <CardDescription>{properties.length} property record(s)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="border-b text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="pb-2 font-medium">Property</th>
                    <th className="pb-2 font-medium">Type</th>
                    <th className="pb-2 font-medium">Location</th>
                    <th className="pb-2 font-medium">Primary owner</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {properties.map((property) => {
                    const primary = property.owners.find((owner) => owner.is_primary);
                    const estate = property.estate ? `, ${property.estate}` : "";

                    return (
                      <tr key={property.id} className="border-b last:border-0">
                        <td className="py-3 pr-4 align-top">
                          <Link
                            href={`/dashboard/properties/${property.id}`}
                            className="font-medium text-danwell-navy hover:underline"
                          >
                            {property.title}
                          </Link>
                          <p className="mt-0.5 max-w-72 text-xs text-muted-foreground">
                            {property.physical_address}
                          </p>
                        </td>
                        <td className="py-3 pr-4 align-top">
                          {labelFor(PROPERTY_TYPES, property.property_type)}
                        </td>
                        <td className="py-3 pr-4 align-top">
                          {property.county}, {property.town}
                          {estate}
                        </td>
                        <td className="py-3 pr-4 align-top">
                          {primary?.owners?.full_name ?? "Not assigned"}
                          {property.owners.length > 1 ? (
                            <p className="text-xs text-muted-foreground">
                              +{property.owners.length - 1} co-owner(s)
                            </p>
                          ) : null}
                        </td>
                        <td className="py-3 pr-4 align-top">
                          <StatusBadge
                            label={labelFor(PROPERTY_STATUSES, property.status)}
                            tone={
                              property.status === "active"
                                ? "positive"
                                : property.status === "maintenance"
                                  ? "warning"
                                  : "muted"
                            }
                          />
                        </td>
                        <td className="py-3 text-right align-top">
                          <div className="flex flex-wrap justify-end gap-2">
                            <Link
                              href={`/dashboard/properties/${property.id}`}
                              className="rounded-lg border px-2.5 py-1 text-xs hover:bg-muted"
                            >
                              View
                            </Link>
                            {canEdit ? (
                              <Link
                                href={`/dashboard/properties/${property.id}/edit`}
                                className="rounded-lg border px-2.5 py-1 text-xs hover:bg-muted"
                              >
                                Edit
                              </Link>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
