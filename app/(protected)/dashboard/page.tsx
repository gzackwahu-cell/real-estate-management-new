import { Suspense } from "react";
import Link from "next/link";
import {
  Bell,
  Building,
  CalendarCheck,
  ClipboardList,
  KeyRound,
  MailOpen,
  Megaphone,
  UsersRound,
  Wallet,
  Wrench,
} from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { EmptyState } from "@/components/portfolio/empty-state";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { DashboardSkeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/auth/dal";
import { formatDate, formatMoney } from "@/lib/finance/constants";
import { getFinanceDashboard } from "@/lib/finance/queries";
import { firstEmbedded } from "@/lib/finance/validation";
import {
  listStaffEnquiries,
  listStaffListings,
  listStaffViewings,
} from "@/lib/listings/staff-queries";
import {
  getMaintenanceRequests,
  getMaintenanceSummary,
} from "@/lib/maintenance/queries";
import {
  getApplications,
  getLeases,
  getTenants,
} from "@/lib/tenancy/queries";
import { isOpenApplicationStatus } from "@/lib/tenancy/constants";
import { getOwners, getProperties } from "@/lib/portfolio/queries";
// eslint-disable-next-line no-restricted-imports -- page is behind requireUser() and permission-aware queries; client is used for aggregated dashboard reads.
import { getAuthorizedServerClient } from "@/lib/supabase/server";

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}

function settled<T>(result: PromiseSettledResult<T>, fallback: T): T {
  return result.status === "fulfilled" ? result.value : fallback;
}

function statusTone(status: string): BadgeTone {
  const value = status.toLowerCase();
  if (["active", "approved", "completed", "paid", "published"].includes(value)) {
    return "positive";
  }
  if (
    ["pending", "under_review", "assigned", "in_progress", "partial", "awaiting_parts"].includes(
      value,
    )
  ) {
    return "warning";
  }
  if (["cancelled", "rejected", "expired", "terminated", "archived", "draft"].includes(value)) {
    return "muted";
  }
  return "neutral";
}

async function DashboardContent() {
  const context = await requireUser();
  const supabase = await getAuthorizedServerClient(context);

  const [
    propertiesResult,
    ownersResult,
    tenantsResult,
    applicationsResult,
    leasesResult,
    financeResult,
    maintenanceSummaryResult,
    requestsResult,
    listingsResult,
    enquiriesResult,
    viewingsResult,
    unitCountResult,
    notificationsResult,
  ] = await Promise.allSettled([
    getProperties(supabase),
    getOwners(supabase),
    getTenants(supabase),
    getApplications(supabase),
    getLeases(supabase),
    getFinanceDashboard(supabase),
    getMaintenanceSummary(supabase),
    getMaintenanceRequests(supabase),
    listStaffListings(supabase),
    listStaffEnquiries(supabase),
    listStaffViewings(supabase),
    supabase
      .from("units")
      .select("id", { count: "exact", head: true })
      .then(({ count, error }) => (error ? 0 : (count ?? 0))),
    supabase
      .from("notifications")
      .select("id, title, message, status, created_at, link")
      .eq("recipient_profile_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }) =>
        (data ?? []).map((n) => ({
          id: String(n.id),
          title: String(n.title),
          message: String(n.message),
          status: String(n.status),
          created_at: typeof n.created_at === "string" ? n.created_at : null,
          link: typeof n.link === "string" ? n.link : null,
        })),
      ),
  ]);

  const properties = settled(propertiesResult, [] as Awaited<ReturnType<typeof getProperties>>);
  const owners = settled(ownersResult, [] as Awaited<ReturnType<typeof getOwners>>);
  const tenants = settled(tenantsResult, [] as Awaited<ReturnType<typeof getTenants>>);
  const applications = settled(
    applicationsResult,
    [] as Awaited<ReturnType<typeof getApplications>>,
  );
  const leases = settled(leasesResult, [] as Awaited<ReturnType<typeof getLeases>>);
  const finance = financeResult.status === "fulfilled" ? financeResult.value : null;
  const maintenance = settled(
    maintenanceSummaryResult,
    { total: 0, open: 0, highPriority: 0, completed: 0, expenseTotal: 0, unpaidExpenses: 0 },
  );
  const requests = settled(requestsResult, [] as Awaited<ReturnType<typeof getMaintenanceRequests>>);
  const listings = settled(listingsResult, [] as Awaited<ReturnType<typeof listStaffListings>>);
  const enquiries = settled(enquiriesResult, [] as Awaited<ReturnType<typeof listStaffEnquiries>>);
  const viewings = settled(viewingsResult, [] as Awaited<ReturnType<typeof listStaffViewings>>);
  const unitCount = settled(unitCountResult, 0);
  const notifications = settled(
    notificationsResult,
    [] as {
      id: string;
      title: string;
      message: string;
      status: string;
      created_at: string | null;
      link: string | null;
    }[],
  );

  const activeLeases = leases.filter((lease) => lease.status === "active").length;
  const openApplications = applications.filter((item) =>
    isOpenApplicationStatus(item.status),
  ).length;
  const publishedListings = listings.filter(
    (listing) => listing.is_published && listing.status === "active",
  ).length;
  const unreadNotifications = notifications.filter(
    (notification) => notification.status === "unread",
  ).length;
  const firstName = context.email?.split("@")[0]?.split(/[._-]/)[0] ?? "there";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operations overview"
        title={`Good day, ${firstName}`}
        description="A live view of your portfolio, tenancies, finance and service requests."
        actions={
          <>
            <Link
              href="/dashboard/reports"
              className="inline-flex h-8 items-center rounded-lg border px-3 text-xs font-medium hover:bg-muted"
            >
              View reports
            </Link>
            <Link
              href="/dashboard/maintenance"
              className="inline-flex h-8 items-center rounded-lg bg-danwell-navy px-3 text-xs font-medium text-white hover:bg-danwell-navy/90"
            >
              Maintenance queue
            </Link>
          </>
        }
      />

      <section aria-label="Key metrics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Properties"
          value={properties.length}
          hint={`${unitCount} units across the portfolio`}
          icon={Building}
          href="/dashboard/properties"
        />
        <StatCard
          label="Owners"
          value={owners.length}
          hint="Registered property owners"
          icon={UsersRound}
          href="/dashboard/owners"
        />
        <StatCard
          label="Tenants"
          value={tenants.length}
          hint={`${activeLeases} active leases`}
          icon={KeyRound}
          tone="teal"
          href="/dashboard/tenants"
        />
        <StatCard
          label="Open applications"
          value={openApplications}
          hint="Pending or under review"
          icon={ClipboardList}
          tone="gold"
          href="/dashboard/applications"
        />
        <StatCard
          label="Rent collected"
          value={formatMoney(finance?.summary.totalCollected ?? 0)}
          hint="Effective rent payments recorded"
          icon={Wallet}
          tone="teal"
          href="/dashboard/finance"
        />
        <StatCard
          label="Outstanding rent"
          value={formatMoney(finance?.summary.outstandingRent ?? 0)}
          hint="Calculated from charges and allocations"
          icon={Wallet}
          tone="warning"
          href="/dashboard/finance/charges"
        />
        <StatCard
          label="Open maintenance"
          value={maintenance.open}
          hint={`${maintenance.highPriority} high priority`}
          icon={Wrench}
          tone="warning"
          href="/dashboard/maintenance"
        />
        <StatCard
          label="Published listings"
          value={publishedListings}
          hint={`${enquiries.length} enquiries · ${viewings.length} viewings`}
          icon={Megaphone}
          href="/dashboard/listings"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-danwell-navy">Recent properties</h2>
            <Link href="/dashboard/properties" className="text-xs font-medium text-danwell-teal hover:underline">
              View all
            </Link>
          </div>
          {properties.length > 0 ? (
            <DataTable
              rows={properties.slice(0, 8)}
              getRowId={(property) => property.id}
              searchPlaceholder="Search properties"
              emptyTitle="No properties match"
              compact
              columns={[
                {
                  header: "Property",
                  searchValue: (property) => property.title,
                  cell: (property) => (
                    <Link
                      href={`/dashboard/properties/${property.id}`}
                      className="font-medium text-danwell-navy hover:underline"
                    >
                      {property.title}
                    </Link>
                  ),
                },
                {
                  header: "Location",
                  searchValue: (property) => `${property.town} ${property.county}`,
                  cell: (property) => (
                    <span className="text-xs text-muted-foreground">
                      {property.town}, {property.county}
                    </span>
                  ),
                },
                {
                  header: "Status",
                  searchValue: (property) => property.status,
                  cell: (property) => (
                    <Badge tone={statusTone(property.status)}>{property.status.replaceAll("_", " ")}</Badge>
                  ),
                },
                {
                  header: "Owners",
                  cell: (property) => (
                    <span className="tabular-nums">{property.owners.length}</span>
                  ),
                  align: "right",
                },
              ]}
            />
          ) : (
            <EmptyState
              title="No properties yet"
              description="Add a property to start building your portfolio."
              href="/dashboard/properties/new"
              actionLabel="Add property"
            />
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-danwell-navy">Attention needed</h2>
            <Link href="/dashboard/maintenance/requests" className="text-xs font-medium text-danwell-teal hover:underline">
              View queue
            </Link>
          </div>
          {requests.length > 0 ? (
            <DataTable
              rows={requests.slice(0, 8)}
              getRowId={(request) => request.id}
              searchPlaceholder="Search requests"
              emptyTitle="No requests match"
              compact
              columns={[
                {
                  header: "Request",
                  searchValue: (request) => `${request.title} ${request.properties?.title ?? ""}`,
                  cell: (request) => (
                    <div className="min-w-0">
                      <Link
                        href={`/dashboard/maintenance/requests/${request.id}`}
                        className="block truncate font-medium text-danwell-navy hover:underline"
                      >
                        {request.title}
                      </Link>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {request.properties?.title ?? "Property"}
                      </span>
                    </div>
                  ),
                },
                {
                  header: "Priority",
                  searchValue: (request) => request.priority,
                  cell: (request) => (
                    <Badge tone={statusTone(request.priority)}>{request.priority}</Badge>
                  ),
                },
                {
                  header: "Status",
                  searchValue: (request) => request.status,
                  cell: (request) => (
                    <Badge tone={statusTone(request.status)}>{request.status.replaceAll("_", " ")}</Badge>
                  ),
                },
                {
                  header: "Reported",
                  searchValue: (request) => request.reported_date,
                  cell: (request) => (
                    <span className="text-xs text-muted-foreground">
                      {formatDate(request.reported_date)}
                    </span>
                  ),
                },
              ]}
            />
          ) : (
            <EmptyState
              title="Nothing needs attention"
              description="Maintenance requests will appear here when reported."
              href="/dashboard/maintenance/requests/new"
              actionLabel="New request"
            />
          )}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-danwell-navy">Recent rent charges</h2>
            <Link href="/dashboard/finance/charges" className="text-xs font-medium text-danwell-teal hover:underline">
              View ledger
            </Link>
          </div>
          {finance && finance.ledger.charges.length > 0 ? (
            <DataTable
              rows={finance.ledger.charges.slice(0, 8)}
              getRowId={(charge) => charge.id}
              searchPlaceholder="Search charges"
              emptyTitle="No charges match"
              compact
              columns={[
                {
                  header: "Tenant",
                  searchValue: (charge) => firstEmbedded(charge.leases?.tenants)?.full_name ?? "",
                  cell: (charge) => (
                    <span className="font-medium text-danwell-navy">
                      {firstEmbedded(charge.leases?.tenants)?.full_name ?? "Tenant"}
                    </span>
                  ),
                },
                {
                  header: "Period",
                  searchValue: (charge) => charge.period_month,
                  cell: (charge) => (
                    <span className="text-xs text-muted-foreground">{charge.period_month}</span>
                  ),
                },
                {
                  header: "Amount",
                  searchValue: (charge) => charge.effective_amount,
                  cell: (charge) => formatMoney(charge.effective_amount),
                  align: "right",
                },
                {
                  header: "Balance",
                  searchValue: (charge) => charge.balance,
                  cell: (charge) => (
                    <span className={charge.balance > 0 ? "font-medium text-amber-700" : "text-emerald-700"}>
                      {formatMoney(charge.balance)}
                    </span>
                  ),
                  align: "right",
                },
              ]}
            />
          ) : (
            <EmptyState
              title="No rent charges yet"
              description="Generate charges for the current period from the finance page."
              href="/dashboard/finance/charges"
              actionLabel="Open charges"
            />
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-danwell-navy">Latest activity</h2>
            <Link href="/dashboard/notifications" className="text-xs font-medium text-danwell-teal hover:underline">
              Notifications
            </Link>
          </div>
          {notifications.length > 0 ? (
            <div className="overflow-hidden rounded-xl border bg-card">
              <ul className="divide-y">
                {notifications.map((notification) => (
                  <li key={notification.id} className="flex gap-3 px-3 py-2.5">
                    <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-danwell-navy/5 text-danwell-navy">
                      <Bell aria-hidden="true" className="size-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-sm font-medium text-danwell-navy">
                          {notification.title}
                        </p>
                        {notification.status === "unread" ? (
                          <Badge tone="info">New</Badge>
                        ) : null}
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {notification.message}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {notification.created_at ? formatDate(notification.created_at) : "—"}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="border-t px-3 py-2 text-[11px] text-muted-foreground">
                {unreadNotifications} unread notification
                {unreadNotifications === 1 ? "" : "s"}
              </div>
            </div>
          ) : (
            <EmptyState
              title="You are all caught up"
              description="New notifications will appear here as work moves forward."
            />
          )}

          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/dashboard/enquiries"
              className="flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:bg-muted/40"
            >
              <MailOpen aria-hidden="true" className="size-4 text-danwell-teal" />
              <span>
                <span className="block text-xs text-muted-foreground">Enquiries</span>
                <span className="block text-lg font-semibold text-danwell-navy tabular-nums">
                  {enquiries.length}
                </span>
              </span>
            </Link>
            <Link
              href="/dashboard/viewings"
              className="flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:bg-muted/40"
            >
              <CalendarCheck aria-hidden="true" className="size-4 text-danwell-teal" />
              <span>
                <span className="block text-xs text-muted-foreground">Viewings</span>
                <span className="block text-lg font-semibold text-danwell-navy tabular-nums">
                  {viewings.length}
                </span>
              </span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
