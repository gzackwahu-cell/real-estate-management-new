import { Suspense } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bell,
  Building2,
  CalendarClock,
  CircleAlert,
  CreditCard,
  Plus,
  Wallet,
  Wrench,
} from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { EmptyState } from "@/components/portfolio/empty-state";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardSkeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/auth/dal";
import { formatDate, formatMoney } from "@/lib/finance/constants";
import { getFinanceDashboard } from "@/lib/finance/queries";
import { firstEmbedded } from "@/lib/finance/validation";
import { listStaffEnquiries, listStaffViewings } from "@/lib/listings/staff-queries";
import { getMaintenanceRequests, getMaintenanceSummary } from "@/lib/maintenance/queries";
import { getApplications, getLeases, getTenants } from "@/lib/tenancy/queries";
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

function tone(status: string): BadgeTone {
  const v = status.toLowerCase();
  if (["active", "approved", "completed", "paid", "published", "resolved", "closed"].includes(v)) return "positive";
  if (["pending", "under_review", "assigned", "in_progress", "partial", "awaiting_parts", "open"].includes(v)) return "warning";
  if (["cancelled", "rejected", "expired", "terminated", "archived", "draft", "overdue"].includes(v)) return "muted";
  return "neutral";
}

function daysUntil(dateStr: string | null | undefined) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
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
    maintenanceResult,
    requestsResult,
    enquiriesResult,
    viewingsResult,
    unitCountResult,
    occupiedUnitResult,
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
    listStaffEnquiries(supabase),
    listStaffViewings(supabase),
    supabase.from("units").select("id", { count: "exact", head: true }).then(({ count }) => count ?? 0),
    supabase.from("units").select("id", { count: "exact", head: true }).eq("status", "occupied").then(({ count }) => count ?? 0),
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
  settled(ownersResult, [] as Awaited<ReturnType<typeof getOwners>>);
  const tenants = settled(tenantsResult, [] as Awaited<ReturnType<typeof getTenants>>);
  const applications = settled(applicationsResult, [] as Awaited<ReturnType<typeof getApplications>>);
  const leases = settled(leasesResult, [] as Awaited<ReturnType<typeof getLeases>>);
  const finance = financeResult.status === "fulfilled" ? financeResult.value : null;
  const maintenance = settled(maintenanceResult, { total: 0, open: 0, highPriority: 0, completed: 0, expenseTotal: 0, unpaidExpenses: 0 });
  const requests = settled(requestsResult, [] as Awaited<ReturnType<typeof getMaintenanceRequests>>);
  const enquiries = settled(enquiriesResult, [] as Awaited<ReturnType<typeof listStaffEnquiries>>);
  const viewings = settled(viewingsResult, [] as Awaited<ReturnType<typeof listStaffViewings>>);
  const unitCount = settled(unitCountResult, 0);
  const occupiedUnits = settled(occupiedUnitResult, 0);
  const notifications = settled(notificationsResult, [] as { id: string; title: string; message: string; status: string; created_at: string | null; link: string | null }[]);

  const activeLeases = leases.filter((l) => l.status === "active");
  const openApplications = applications.filter((a) => isOpenApplicationStatus(a.status)).length;
  const occupancyRate = unitCount > 0 ? Math.round((occupiedUnits / unitCount) * 100) : 0;
  const upcomingExpirations = activeLeases
    .map((l) => ({ ...l, days: daysUntil(l.end_date) }))
    .filter((l) => l.days !== null && l.days >= 0 && l.days <= 60)
    .sort((a, b) => (a.days ?? 999) - (b.days ?? 999))
    .slice(0, 5);
  const recentPayments = (finance?.ledger.payments ?? []).slice(0, 5);
  const pendingMaintenance = requests.filter((r) => !["completed", "cancelled", "closed"].includes(r.status)).slice(0, 5);
  const recentActivity = notifications.slice(0, 5);
  const unread = notifications.filter((n) => n.status === "unread").length;
  const firstName = context.email?.split("@")[0]?.split(/[._-]/)[0] ?? "there";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Overview"
        title={`Good day, ${firstName}`}
        description="Key portfolio, tenancy, finance, and maintenance signals at a glance."
        actions={
          <Link href="/dashboard/reports" className="inline-flex h-8 items-center rounded-lg border px-3 text-xs font-medium hover:bg-muted">
            View reports
          </Link>
        }
      />

      <section aria-label="Key metrics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Occupancy" value={`${occupancyRate}%`} hint={`${occupiedUnits} of ${unitCount} units occupied`} icon={Building2} tone="teal" href="/dashboard/properties" />
        <StatCard label="Rent collected" value={formatMoney(finance?.summary.totalCollected ?? 0)} hint="Effective rent payments recorded" icon={Wallet} tone="teal" href="/dashboard/finance/payments" />
        <StatCard label="Outstanding arrears" value={formatMoney(finance?.summary.outstandingRent ?? 0)} hint="Outstanding rent balance" icon={CircleAlert} tone="warning" href="/dashboard/arrears" />
        <StatCard label="Pending maintenance" value={maintenance.open} hint={`${maintenance.highPriority} high priority`} icon={Wrench} tone="warning" href="/dashboard/maintenance/requests" />
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Quick actions</CardTitle>
            <CardDescription>Common tasks for daily operations.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {[
              { href: "/dashboard/properties/new", label: "Add property", icon: Building2 },
              { href: "/dashboard/tenants/new", label: "Add tenant", icon: Plus },
              { href: "/dashboard/finance/payments/new", label: "Record payment", icon: CreditCard },
              { href: "/dashboard/maintenance/requests/new", label: "New maintenance request", icon: Wrench },
              { href: "/dashboard/listings/new", label: "Create listing", icon: Plus },
            ].map((action) => (
              <Link key={action.href} href={action.href} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm hover:bg-muted/40">
                <span className="flex items-center gap-2"><action.icon aria-hidden="true" className="size-4 text-danwell-teal" />{action.label}</span>
                <ArrowRight aria-hidden="true" className="size-4 text-muted-foreground" />
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="xl:col-span-1">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle className="text-sm">Upcoming lease expirations</CardTitle>
                <CardDescription>Active leases ending within 60 days.</CardDescription>
              </div>
              <Link href="/dashboard/leases" className="text-xs font-medium text-danwell-teal hover:underline">View all</Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcomingExpirations.length > 0 ? upcomingExpirations.map((lease) => (
              <Link key={lease.id} href={`/dashboard/leases/${lease.id}`} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm hover:bg-muted/40">
                <div className="min-w-0">
                  <p className="truncate font-medium text-danwell-navy">{firstEmbedded(lease.tenants)?.full_name ?? "Tenant"}</p>
                  <p className="truncate text-xs text-muted-foreground">{lease.units?.properties?.title ?? "Property"}</p>
                </div>
                <Badge tone={(lease.days ?? 0) <= 14 ? "warning" : "neutral"}>{lease.days}d</Badge>
              </Link>
            )) : <p className="text-sm text-muted-foreground">No leases expiring in the next 60 days.</p>}
          </CardContent>
        </Card>

        <Card className="xl:col-span-1">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle className="text-sm">Recent payments</CardTitle>
                <CardDescription>Latest recorded rent payments.</CardDescription>
              </div>
              <Link href="/dashboard/finance/payments" className="text-xs font-medium text-danwell-teal hover:underline">View all</Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentPayments.length > 0 ? recentPayments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium text-danwell-navy">{firstEmbedded(payment.leases?.tenants)?.full_name ?? "Tenant"}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(payment.payment_date)}</p>
                </div>
                <span className="font-medium text-danwell-navy">{formatMoney(payment.amount)}</span>
              </div>
            )) : <p className="text-sm text-muted-foreground">No payments recorded yet.</p>}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle className="text-sm">Pending maintenance</CardTitle>
                <CardDescription>Open requests needing attention.</CardDescription>
              </div>
              <Link href="/dashboard/maintenance/requests" className="text-xs font-medium text-danwell-teal hover:underline">Queue</Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingMaintenance.length > 0 ? pendingMaintenance.map((request) => (
              <Link key={request.id} href={`/dashboard/maintenance/requests/${request.id}`} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm hover:bg-muted/40">
                <div className="min-w-0">
                  <p className="truncate font-medium text-danwell-navy">{request.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{request.properties?.title ?? "Property"} · {formatDate(request.reported_date)}</p>
                </div>
                <Badge tone={tone(request.priority)}>{request.priority}</Badge>
              </Link>
            )) : <EmptyState title="No pending maintenance" description="New requests will appear here." href="/dashboard/maintenance/requests/new" actionLabel="New request" />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle className="text-sm">Recent activity</CardTitle>
                <CardDescription>{unread} unread notification{unread === 1 ? "" : "s"}.</CardDescription>
              </div>
              <Link href="/dashboard/notifications" className="text-xs font-medium text-danwell-teal hover:underline">All notifications</Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentActivity.length > 0 ? recentActivity.map((n) => (
              <div key={n.id} className="flex gap-3 rounded-lg border px-3 py-2">
                <Bell aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-danwell-teal" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium text-danwell-navy">{n.title}</p>
                    {n.status === "unread" ? <Badge tone="info">New</Badge> : null}
                  </div>
                  <p className="line-clamp-1 text-xs text-muted-foreground">{n.message}</p>
                </div>
              </div>
            )) : <p className="text-sm text-muted-foreground">You are all caught up.</p>}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Properties" value={properties.length} hint={`${unitCount} units`} icon={Building2} href="/dashboard/properties" />
        <StatCard label="Active leases" value={activeLeases.length} hint={`${tenants.length} tenants`} icon={CalendarClock} href="/dashboard/leases" />
        <StatCard label="Open applications" value={openApplications} hint="Pending review" icon={Plus} href="/dashboard/applications" />
        <StatCard label="Enquiries / Viewings" value={`${enquiries.length} / ${viewings.length}`} hint="Sales & marketing pipeline" icon={Bell} href="/dashboard/enquiries" />
      </section>
    </div>
  );
}
