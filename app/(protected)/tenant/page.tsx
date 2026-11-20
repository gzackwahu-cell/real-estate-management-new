import { Suspense } from "react";
import Link from "next/link";
import { ContactManagementCard } from "@/components/portal/contact-management-card";
import { PortalDetail, PortalDetailList } from "@/components/portal/portal-detail-list";
import { PortalLoading } from "@/components/portal/portal-loading";
import { NoticeList } from "@/components/portal/notice-list";
import { PortalPageHeader } from "@/components/portal/portal-page-header";
import { PortalStatCard } from "@/components/portal/portal-stat-card";
import { TenantLeaseCards } from "@/components/portal/tenant/tenant-lease-cards";
import { MaintenanceTable } from "@/components/maintenance/maintenance-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/portfolio/empty-state";
import { withRoles } from "@/lib/auth/guards";
import { ROLES } from "@/lib/auth/roles";
import { formatMoney, isCurrentLeaseStatus } from "@/lib/tenancy/constants";
import { loadTenantPortal } from "@/lib/portal/tenant";

const quickLinks = [
  { href: "/tenant/profile", label: "My profile" },
  { href: "/tenant/leases", label: "Lease & property" },
  { href: "/tenant/payments", label: "Charges & payments" },
  { href: "/tenant/receipts", label: "Receipts" },
  { href: "/tenant/maintenance", label: "Maintenance" },
];

export default function TenantPage() {
  return (
    <Suspense fallback={<PortalLoading label="Loading your tenancy..." />}>
      <TenantDashboard />
    </Suspense>
  );
}

async function TenantDashboard() {
  const data = await withRoles(
    [ROLES.TENANT, ROLES.SUPER_ADMIN, ROLES.ADMIN],
    (_context, supabase) => loadTenantPortal(supabase, _context.userId),
  );

  if (!data) {
    return (
      <EmptyState
        title="No tenancy profile linked"
        description="Contact management if your user account should be linked to a tenant record."
      />
    );
  }

  const currentLeases = data.leases.filter((lease) =>
    isCurrentLeaseStatus(lease.status),
  );
  const currentLease = currentLeases[0];
  const openRequests = data.requests.filter(
    (request) =>
      request.status !== "completed" && request.status !== "cancelled",
  );
  const unreadNotices = data.notifications.filter(
    (notice) => notice.status === "unread",
  ).length;

  return (
    <div className="space-y-6">
      <PortalPageHeader
        eyebrow="My tenancy"
        title={`Welcome, ${data.tenant.full_name}`}
        description="You can only see your own profile, leases, charges, payments, receipts and maintenance requests."
      />

      {!data.summary && data.ledger === null ? (
        <p className="rounded-lg border border-amber-500/20 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Financial and maintenance records are not available yet. The related
          prepared migrations may still be pending.
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <PortalStatCard
          label="Outstanding rent"
          value={formatMoney(data.summary?.outstandingRent ?? 0)}
          hint="From your own rent charges"
          accent="gold"
        />
        <PortalStatCard
          label="Deposit held"
          value={formatMoney(data.summary?.depositsHeld ?? 0)}
          hint={`${formatMoney(data.summary?.depositsOutstanding ?? 0)} outstanding`}
          accent="teal"
        />
        <PortalStatCard
          label="Open maintenance"
          value={openRequests.length}
          hint={`${data.requests.length} total request(s)`}
          accent="navy"
        />
        <PortalStatCard
          label="New notices"
          value={unreadNotices}
          hint={`${data.notifications.length} notification(s)`}
          accent="navy"
        />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-danwell-navy">Quick links</CardTitle>
          <CardDescription>
            Everything related to your tenancy in one place.
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

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg text-danwell-navy">
              Current lease & property
            </CardTitle>
            <CardDescription>
              Your active or pending lease with property and unit details.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TenantLeaseCards
              leases={currentLeases}
              emptyMessage="You do not have a current lease on record."
            />
            {currentLease ? (
              <Link
                href="/tenant/leases"
                className="mt-4 inline-block text-sm text-danwell-teal hover:underline"
              >
                View all leases →
              </Link>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-danwell-navy">
              Contact details
            </CardTitle>
            <CardDescription>Information management uses to reach you.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <PortalDetailList columns="grid-cols-1">
              <PortalDetail label="Phone" value={data.tenant.phone} />
              <PortalDetail label="Email" value={data.tenant.email || "Not provided"} />
              <PortalDetail label="Reference" value={data.tenant.id_reference} />
            </PortalDetailList>
            <Link
              href="/tenant/profile"
              className="inline-block text-sm text-danwell-teal hover:underline"
            >
              View full profile →
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-danwell-navy">
              Recent notices
            </CardTitle>
            <CardDescription>Latest messages prepared for your account.</CardDescription>
          </CardHeader>
          <CardContent>
            <NoticeList notifications={data.notifications} limit={4} />
            <Link
              href="/tenant/notices"
              className="mt-4 inline-block text-sm text-danwell-teal hover:underline"
            >
              View all notices →
            </Link>
          </CardContent>
        </Card>

        <ContactManagementCard />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-danwell-navy">
            Maintenance
          </CardTitle>
          <CardDescription>
            Your own reports and their current progress.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.requests.length === 0 ? (
            <EmptyState
              title="No maintenance requests"
              description="Report an issue and follow its progress in the maintenance section."
              href="/tenant/maintenance"
              actionLabel="Go to maintenance"
            />
          ) : (
            <>
              <MaintenanceTable requests={data.requests} tenantView limit={5} />
              <Link
                href="/tenant/maintenance"
                className="mt-4 inline-block text-sm text-danwell-teal hover:underline"
              >
                Manage maintenance →
              </Link>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
