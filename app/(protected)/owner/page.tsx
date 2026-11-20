import { Suspense } from "react";
import Link from "next/link";
import { ContactManagementCard } from "@/components/portal/contact-management-card";
import { EmptyState } from "@/components/portfolio/empty-state";
import { NoticeList } from "@/components/portal/notice-list";
import { PortalPageHeader } from "@/components/portal/portal-page-header";
import { PortalStatCard } from "@/components/portal/portal-stat-card";
import {
  OwnerFinanceTable,
  OwnerPropertyTable,
  OwnerTenantTable,
} from "@/components/portal/owner/owner-tables";
import { MaintenanceTable } from "@/components/maintenance/maintenance-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { withRoles } from "@/lib/auth/guards";
import { ROLES } from "@/lib/auth/roles";
import { formatMoney, isCurrentLeaseStatus } from "@/lib/tenancy/constants";
import {
  loadOwnerPortal,
  summarizeOwnerFinance,
} from "@/lib/portal/owner";
import { PortalLoading } from "@/components/portal/portal-loading";

const quickLinks = [
  { href: "/owner/properties", label: "View properties & units" },
  { href: "/owner/finance", label: "View statements & payments" },
  { href: "/owner/maintenance", label: "Track maintenance" },
  { href: "/owner/notices", label: "Read notices" },
];

export default function OwnerPage() {
  return (
    <Suspense fallback={<PortalLoading label="Loading your owner dashboard..." />}>
      <OwnerDashboard />
    </Suspense>
  );
}

async function OwnerDashboard() {
  const data = await withRoles(
    [ROLES.OWNER, ROLES.SUPER_ADMIN, ROLES.ADMIN],
    (_context, supabase) => loadOwnerPortal(supabase, _context.userId),
  );

  const financeTotals = summarizeOwnerFinance(data.finance);
  const units = data.properties.reduce(
    (totals, property) => ({
      total: totals.total + property.occupancy.total,
      occupied: totals.occupied + property.occupancy.occupied,
      vacant: totals.vacant + property.occupancy.vacant,
      potential: totals.potential + property.occupancy.potentialMonthlyRent,
    }),
    { total: 0, occupied: 0, vacant: 0, potential: 0 },
  );
  const activeLeases = data.tenants.filter((row) =>
    isCurrentLeaseStatus(row.lease_status),
  ).length;
  const openMaintenance = data.maintenance.filter(
    (request) =>
      request.status !== "completed" && request.status !== "cancelled",
  ).length;

  return (
    <div className="space-y-6">
      <PortalPageHeader
        eyebrow="Owner overview"
        title="Your portfolio at a glance"
        description="Figures are limited to properties linked to your verified ownership record."
      />

      {data.properties.length === 0 ? (
        <EmptyState
          title="No verified properties linked"
          description="Once a property owner record is verified against your account, your portfolio will appear here."
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <PortalStatCard
              label="Owned properties"
              value={data.properties.length}
              hint="Verified ownership only"
              accent="navy"
            />
            <PortalStatCard
              label="Occupancy"
              value={`${units.occupied}/${units.total}`}
              hint={`${units.vacant} vacant unit(s)`}
              accent="teal"
            />
            <PortalStatCard
              label="Rental income"
              value={formatMoney(financeTotals.collected)}
              hint={`${formatMoney(financeTotals.outstanding)} outstanding`}
              accent="gold"
            />
            <PortalStatCard
              label="Open maintenance"
              value={openMaintenance}
              hint={`${activeLeases} current lease(s)`}
              accent="navy"
            />
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-danwell-navy">Quick links</CardTitle>
              <CardDescription>
               Move between your properties, statements, maintenance and notices.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {quickLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="inline-flex h-9 items-center rounded-lg border border-danwell-navy/15 px-3 text-sm font-medium text-danwell-navy transition-colors hover:bg-danwell-navy/5"
                >
                  {link.label}
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-danwell-navy">
                Owned properties
              </CardTitle>
              <CardDescription>
                Unit occupancy and potential monthly rent by property.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OwnerPropertyTable properties={data.properties} />
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-danwell-navy">
                  Recent notices
                </CardTitle>
                <CardDescription>
                  Latest messages prepared for your account.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <NoticeList notifications={data.notifications} limit={4} />
              </CardContent>
            </Card>

            <ContactManagementCard />
          </div>

          {data.finance.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-danwell-navy">
                  Payment summary
                </CardTitle>
                <CardDescription>
                  Aggregates only; individual tenant payment details are not shown.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <OwnerFinanceTable rows={data.finance} />
              </CardContent>
            </Card>
          ) : null}

          {data.tenants.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-danwell-navy">
                  Tenant & lease overview
                </CardTitle>
                <CardDescription>
                  Limited contact and lease fields for your occupied units.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <OwnerTenantTable rows={data.tenants} />
              </CardContent>
            </Card>
          ) : null}

          {data.maintenance.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-danwell-navy">
                  Maintenance progress
                </CardTitle>
                <CardDescription>
                  Requests reported for your properties and their current status.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MaintenanceTable
                  requests={data.maintenance}
                  hrefBase="/owner/maintenance"
                  limit={5}
                />
              </CardContent>
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}
