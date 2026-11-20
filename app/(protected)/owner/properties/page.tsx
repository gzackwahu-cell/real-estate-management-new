import { Suspense } from "react";
import { EmptyState } from "@/components/portfolio/empty-state";
import { PortalLoading } from "@/components/portal/portal-loading";
import { PortalPageHeader } from "@/components/portal/portal-page-header";
import { PortalStatCard } from "@/components/portal/portal-stat-card";
import { OwnerPropertyTable } from "@/components/portal/owner/owner-tables";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { withRoles } from "@/lib/auth/guards";
import { ROLES } from "@/lib/auth/roles";
import { loadOwnerPortal } from "@/lib/portal/owner";
import { formatMoney } from "@/lib/tenancy/constants";

export default function OwnerPropertiesPage() {
  return (
    <Suspense fallback={<PortalLoading label="Loading your properties..." />}>
      <OwnerPropertiesContent />
    </Suspense>
  );
}

async function OwnerPropertiesContent() {
  const data = await withRoles(
    [ROLES.OWNER, ROLES.SUPER_ADMIN, ROLES.ADMIN],
    (_context, supabase) => loadOwnerPortal(supabase, _context.userId),
  );

  const totals = data.properties.reduce(
    (result, property) => ({
      units: result.units + property.occupancy.total,
      occupied: result.occupied + property.occupancy.occupied,
      vacant: result.vacant + property.occupancy.vacant,
      rent: result.rent + property.occupancy.potentialMonthlyRent,
    }),
    { units: 0, occupied: 0, vacant: 0, rent: 0 },
  );

  return (
    <div className="space-y-6">
      <PortalPageHeader
        eyebrow="Owner portfolio"
        title="My properties"
        description="Only properties with a verified ownership record linked to your account are listed."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <PortalStatCard label="Properties" value={data.properties.length} accent="navy" />
        <PortalStatCard label="Units" value={totals.units} accent="teal" />
        <PortalStatCard
          label="Occupied / vacant"
          value={`${totals.occupied} / ${totals.vacant}`}
          accent="gold"
        />
        <PortalStatCard
          label="Potential monthly rent"
          value={formatMoney(totals.rent)}
          accent="navy"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-danwell-navy">
            Owned property list
          </CardTitle>
          <CardDescription>
            Select a property for units, occupancy, statements, attachments and
            maintenance.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.properties.length === 0 ? (
            <EmptyState
              title="No verified properties"
              description="Contact management if a property ownership record is missing or awaiting verification."
            />
          ) : (
            <OwnerPropertyTable properties={data.properties} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
