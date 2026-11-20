import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AttachmentList } from "@/components/portfolio/attachment-list";
import { MaintenanceTable } from "@/components/maintenance/maintenance-table";
import { PortalDetail, PortalDetailList } from "@/components/portal/portal-detail-list";
import { PortalLoading } from "@/components/portal/portal-loading";
import { PortalPageHeader } from "@/components/portal/portal-page-header";
import { PortalStatCard } from "@/components/portal/portal-stat-card";
import {
  OwnerTenantTable,
  OwnerUnitTable,
} from "@/components/portal/owner/owner-tables";
import { StatusBadge } from "@/components/portfolio/status-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { withRoles } from "@/lib/auth/guards";
import { ROLES } from "@/lib/auth/roles";
import { getAttachmentViews } from "@/lib/portfolio/attachment-queries";
import { formatMoney, formatDate } from "@/lib/tenancy/constants";
import {
  getOwnershipMap,
  loadOwnerFinanceSummary,
  loadOwnerMaintenance,
  loadOwnerPropertyDetail,
  loadOwnerStatement,
  loadOwnerTenantOverview,
  summarizeOwnerFinance,
} from "@/lib/portal/owner";
import { labelFor, PROPERTY_TYPES } from "@/lib/portfolio/constants";

type OwnerPropertyPageProps = {
  params: Promise<{ id: string }>;
};

export default function OwnerPropertyPage({ params }: OwnerPropertyPageProps) {
  return (
    <Suspense fallback={<PortalLoading label="Loading property details..." />}>
      <OwnerPropertyContent params={params} />
    </Suspense>
  );
}

async function OwnerPropertyContent({ params }: OwnerPropertyPageProps) {
  const { id } = await params;

  const data = await withRoles(
    [ROLES.OWNER, ROLES.SUPER_ADMIN, ROLES.ADMIN],
    async (_context, supabase) => {
      const ownership = await getOwnershipMap(supabase, _context.userId);
      if (!ownership.has(id)) {
        return null;
      }

      const [detail, finance, tenants, maintenance, statement] =
        await Promise.all([
          loadOwnerPropertyDetail(supabase, ownership, id),
          loadOwnerFinanceSummary(supabase, ownership, id),
          loadOwnerTenantOverview(supabase, ownership, id),
          loadOwnerMaintenance(supabase, ownership, id),
          loadOwnerStatement(supabase, ownership, id),
        ]);

      if (!detail) {
        return null;
      }
      const attachmentViews = await getAttachmentViews(supabase, detail.attachments);
      return { detail, attachmentViews, finance, tenants, maintenance, statement };
    },
  );

  if (!data?.detail) {
    notFound();
  }

  const { detail, attachmentViews, finance, tenants, maintenance, statement } = data;
  const { property, units } = detail;
  const financeTotals = summarizeOwnerFinance(finance);
  const occupied = units.filter(
    (unit) => unit.occupancy_status === "occupied" && unit.is_active,
  ).length;
  const vacant = units.filter(
    (unit) => unit.occupancy_status === "vacant" && unit.is_active,
  ).length;
  const potentialRent = units
    .filter((unit) => unit.is_active)
    .reduce((total, unit) => total + unit.monthly_rent, 0);

  return (
    <div className="space-y-6">
      <Link
        href="/owner/properties"
        className="inline-block text-sm text-danwell-teal hover:underline"
      >
        ← Back to properties
      </Link>

      <PortalPageHeader
        eyebrow="Owned property"
        title={property.title}
        description={property.description || "Property details and related records."}
        action={
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/owner/finance?propertyId=${property.id}`}
              className="inline-flex h-9 items-center rounded-lg border px-3 text-sm font-medium text-danwell-navy hover:bg-muted"
            >
              Statements
            </Link>
            <Link
              href={`/owner/maintenance?propertyId=${property.id}`}
              className="inline-flex h-9 items-center rounded-lg border px-3 text-sm font-medium text-danwell-navy hover:bg-muted"
            >
              Maintenance
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <PortalStatCard label="Units" value={units.length} accent="navy" />
        <PortalStatCard
          label="Occupied / vacant"
          value={`${occupied} / ${vacant}`}
          accent="teal"
        />
        <PortalStatCard
          label="Potential monthly rent"
          value={formatMoney(potentialRent)}
          accent="gold"
        />
        <PortalStatCard
          label="Collected rent"
          value={formatMoney(financeTotals.collected)}
          hint={`${formatMoney(financeTotals.outstanding)} outstanding`}
          accent="navy"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-danwell-navy">Property details</CardTitle>
          <CardDescription>Registered location and property classification.</CardDescription>
        </CardHeader>
        <CardContent>
          <PortalDetailList columns="sm:grid-cols-2 lg:grid-cols-3">
            <PortalDetail label="Type" value={labelFor(PROPERTY_TYPES, property.property_type)} />
            <PortalDetail label="Town" value={property.town} />
            <PortalDetail label="County" value={property.county} />
            <PortalDetail label="Estate" value={property.estate || "—"} />
            <PortalDetail label="Address" value={property.physical_address} />
            <PortalDetail
              label="Record status"
              value={
                <StatusBadge
                  label={property.status}
                  tone={property.status === "active" ? "positive" : "muted"}
                />
              }
            />
            {property.directions ? (
              <PortalDetail label="Directions" value={property.directions} className="sm:col-span-2" />
            ) : null}
          </PortalDetailList>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-danwell-navy">Units & occupancy</CardTitle>
          <CardDescription>
            {units.length} unit(s) registered on this property.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {units.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No units have been registered for this property.
            </p>
          ) : (
            <OwnerUnitTable units={units} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-danwell-navy">
            Tenant & lease overview
          </CardTitle>
          <CardDescription>
            Restricted to name, contact, unit, lease dates, status and rent.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tenants.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No lease records are linked to this property.
            </p>
          ) : (
            <OwnerTenantTable rows={tenants} />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-danwell-navy">
              Financial statement
            </CardTitle>
            <CardDescription>
              Monthly billed, collected and outstanding totals.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {statement.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No statement rows are available for this property yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[460px] text-sm">
                  <thead className="border-b text-left text-xs text-muted-foreground">
                    <tr>
                      <th className="pb-2 pr-4 font-medium">Period</th>
                      <th className="pb-2 pr-4 text-right font-medium">Billed</th>
                      <th className="pb-2 pr-4 text-right font-medium">Collected</th>
                      <th className="pb-2 text-right font-medium">Outstanding</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statement.map((row) => (
                      <tr key={row.period_month} className="border-b last:border-0">
                        <td className="py-2 pr-4 font-medium">{formatDate(`${row.period_month}-01`)}</td>
                        <td className="py-2 pr-4 text-right">{formatMoney(row.billed)}</td>
                        <td className="py-2 pr-4 text-right">{formatMoney(row.collected)}</td>
                        <td className="py-2 text-right font-medium">
                          {formatMoney(row.outstanding)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-danwell-navy">
              Property attachments
            </CardTitle>
            <CardDescription>
              Available documents registered against this property.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AttachmentList
              attachments={attachmentViews}
              emptyMessage="No attachments have been added to this property."
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-danwell-navy">
            Maintenance requests
          </CardTitle>
          <CardDescription>
            Progress for reports linked to this property.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {maintenance.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No maintenance requests have been reported for this property.
            </p>
          ) : (
            <MaintenanceTable
              requests={maintenance}
              hrefBase="/owner/maintenance"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
