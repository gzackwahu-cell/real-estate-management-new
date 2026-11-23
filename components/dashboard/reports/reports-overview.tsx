import Link from "next/link";
import type { ReactNode } from "react";
import {
  Building2,
  CircleAlert,
  FileText,
  Wallet,
  Wrench,
} from "lucide-react";
import { StatCard } from "@/components/admin/stat-card";
import { StatusBadge } from "@/components/portfolio/status-badge";
import {
  formatDateTime,
  formatMoney,
  formatPeriod,
} from "@/lib/finance/constants";
import type { ReportSnapshot } from "@/lib/reports/queries";
import {
  applicationStatusTone,
  formatDate,
  leaseStatusTone,
} from "@/lib/tenancy/constants";
import { ReportSection } from "./report-section";

function DetailRow({
  href,
  title,
  meta,
  badge,
}: {
  href: string;
  title: string;
  meta: string;
  badge?: ReactNode;
}) {
  return (
    <li className="flex items-start justify-between gap-3 py-2">
      <div className="min-w-0">
        <Link href={href} className="text-sm font-medium text-danwell-navy hover:underline">
          {title}
        </Link>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{meta}</p>
      </div>
      {badge ? <div className="shrink-0">{badge}</div> : null}
    </li>
  );
}

function EmptyList({ label }: { label: string }) {
  return <p className="mt-3 text-sm text-muted-foreground">No {label} in scope.</p>;
}

function maintenanceTone(value: string): "neutral" | "positive" | "warning" | "muted" {
  if (value === "completed" || value === "paid") return "positive";
  if (value === "high" || value === "emergency" || value === "overdue") return "warning";
  if (value === "cancelled") return "muted";
  return "neutral";
}

export function ReportsOverview({ report }: { report: ReportSnapshot }) {
  const periodLabel = formatPeriod(report.filters.period);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {report.finance.state === "ready" ? (
          <StatCard
            label={`Collected · ${periodLabel}`}
            value={formatMoney(report.finance.data.collected)}
            hint={`${formatMoney(report.finance.data.outstanding)} outstanding`}
            icon={Wallet}
            tone="teal"
            href="/dashboard/finance"
          />
        ) : null}
        {report.portfolio.state === "ready" ? (
          <StatCard
            label="Properties"
            value={report.portfolio.data.total}
            hint={`${report.portfolio.data.active} active · ${report.portfolio.data.counties} counties`}
            icon={Building2}
            href="/dashboard/properties"
          />
        ) : null}
        {report.tenancy.state === "ready" ? (
          <StatCard
            label="Active leases"
            value={report.tenancy.data.activeLeases}
            hint={`${report.tenancy.data.pendingApplications} applications awaiting review`}
            icon={FileText}
            href="/dashboard/leases"
          />
        ) : null}
        {report.maintenance.state === "ready" ? (
          <StatCard
            label="Open maintenance"
            value={report.maintenance.data.open}
            hint={`${report.maintenance.data.highPriority} high priority`}
            icon={Wrench}
            tone={report.maintenance.data.open > 0 ? "gold" : "default"}
            href="/dashboard/maintenance/requests"
          />
        ) : null}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ReportSection
          title="Finance"
          description={`Billing and collections for ${periodLabel}, from existing finance records.`}
          section={report.finance}
          href="/dashboard/finance"
          hrefLabel="Finance workspace"
        >
          {(data) => (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <p>
                  <span className="text-muted-foreground">Billed: </span>
                  {formatMoney(data.billed)}
                </p>
                <p>
                  <span className="text-muted-foreground">Collected: </span>
                  {formatMoney(data.collected)}
                </p>
                <p>
                  <span className="text-muted-foreground">Outstanding: </span>
                  {formatMoney(data.outstanding)}
                </p>
                <p>
                  <span className="text-muted-foreground">Deposits held: </span>
                  {formatMoney(data.depositsHeld)}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                {data.chargeCount} charge(s) · {data.paymentCount} payment(s) ·{" "}
                {data.receiptCount} receipt(s)
              </p>
              {data.receipts.length === 0 ? (
                <EmptyList label="recent receipts" />
              ) : (
                <ul className="divide-y rounded-lg border">
                  {data.receipts.map((receipt) => (
                    <DetailRow
                      key={receipt.id}
                      href={`/dashboard/finance/receipts/${receipt.id}`}
                      title={receipt.number}
                      meta={`${receipt.tenant ?? "Unassigned tenant"} · ${formatDateTime(receipt.issuedAt)}`}
                      badge={<StatusBadge label={formatMoney(receipt.amount)} tone="positive" />}
                    />
                  ))}
                </ul>
              )}
            </div>
          )}
        </ReportSection>

        <ReportSection
          title="Portfolio"
          description="Property and ownership counts from the authorized portfolio records."
          section={report.portfolio}
          href="/dashboard/properties"
          hrefLabel="Properties"
        >
          {(data) => (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-sm">
                <p>
                  <span className="text-muted-foreground">Total: </span>
                  {data.total}
                </p>
                <p>
                  <span className="text-muted-foreground">Active: </span>
                  {data.active}
                </p>
                <p>
                  <span className="text-muted-foreground">Owner links: </span>
                  {data.ownerLinks}
                </p>
              </div>
              {data.properties.length === 0 ? (
                <EmptyList label="properties" />
              ) : (
                <ul className="divide-y rounded-lg border">
                  {data.properties.map((property) => (
                    <DetailRow
                      key={property.id}
                      href={`/dashboard/properties/${property.id}`}
                      title={property.title}
                      meta={`${property.location || "Location not set"} · ${property.owners} owner(s)`}
                      badge={<StatusBadge label={property.status} tone={maintenanceTone(property.status)} />}
                    />
                  ))}
                </ul>
              )}
            </div>
          )}
        </ReportSection>

        <ReportSection
          title="Tenancy"
          description="Lease and application position from existing tenancy records."
          section={report.tenancy}
          href="/dashboard/leases"
          hrefLabel="Leases"
        >
          {(data) => (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <p>
                  <span className="text-muted-foreground">Leases: </span>
                  {data.leases}
                </p>
                <p>
                  <span className="text-muted-foreground">Active: </span>
                  {data.activeLeases}
                </p>
                <p>
                  <span className="text-muted-foreground">Pending applications: </span>
                  {data.pendingApplications}
                </p>
                <p>
                  <span className="text-muted-foreground">Active rent roll: </span>
                  {formatMoney(data.monthlyRentRoll)}
                </p>
              </div>
              {data.recentLeases.length === 0 &&
              data.recentApplications.length === 0 ? (
                <EmptyList label="leases or applications" />
              ) : (
                <ul className="divide-y rounded-lg border">
                  {data.recentLeases.map((lease) => (
                    <DetailRow
                      key={lease.id}
                      href={`/dashboard/leases/${lease.id}`}
                      title={lease.tenant}
                      meta={`${lease.property} · ${lease.unit} · ${formatDate(lease.startDate)} · ${formatMoney(lease.monthlyRent)}/mo`}
                      badge={
                        <StatusBadge
                          label={lease.status}
                          tone={leaseStatusTone(lease.status)}
                        />
                      }
                    />
                  ))}
                  {data.recentApplications.map((application) => (
                    <DetailRow
                      key={application.id}
                      href={`/dashboard/applications/${application.id}`}
                      title={application.applicant}
                      meta={`${application.property} · ${application.unit} · ${formatDate(application.applicationDate)}`}
                      badge={
                        <StatusBadge
                          label={application.status}
                          tone={applicationStatusTone(application.status)}
                        />
                      }
                    />
                  ))}
                </ul>
              )}
            </div>
          )}
        </ReportSection>

        <ReportSection
          title="Maintenance"
          description="Request workload and recorded expenses from maintenance data."
          section={report.maintenance}
          href="/dashboard/maintenance/requests"
          hrefLabel="Requests"
        >
          {(data) => (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <p>
                  <span className="text-muted-foreground">Total: </span>
                  {data.total}
                </p>
                <p>
                  <span className="text-muted-foreground">Open: </span>
                  {data.open}
                </p>
                <p>
                  <span className="text-muted-foreground">High priority: </span>
                  {data.highPriority}
                </p>
                <p>
                  <span className="text-muted-foreground">Completed: </span>
                  {data.completed}
                </p>
                <p>
                  <span className="text-muted-foreground">Expenses: </span>
                  {formatMoney(data.expenseTotal)}
                </p>
                <p>
                  <span className="text-muted-foreground">Unpaid: </span>
                  {formatMoney(data.unpaidExpenses)}
                </p>
              </div>
              {data.requests.length === 0 ? (
                <EmptyList label="maintenance requests" />
              ) : (
                <ul className="divide-y rounded-lg border">
                  {data.requests.map((request) => (
                    <DetailRow
                      key={request.id}
                      href={`/dashboard/maintenance/requests/${request.id}`}
                      title={request.title}
                      meta={`${request.property} · ${formatDate(request.reportedDate)}`}
                      badge={
                        <div className="flex gap-1">
                          <StatusBadge
                            label={request.priority}
                            tone={maintenanceTone(request.priority)}
                          />
                          <StatusBadge
                            label={request.status}
                            tone={maintenanceTone(request.status)}
                          />
                        </div>
                      }
                    />
                  ))}
                </ul>
              )}
            </div>
          )}
        </ReportSection>

        <ReportSection
          title="Listings"
          description="Published listings and lead activity from the website records."
          section={report.listings}
          href="/dashboard/listings"
          hrefLabel="Listings"
        >
          {(data) => (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-sm">
                <p>
                  <span className="text-muted-foreground">Listings: </span>
                  {data.listings}
                </p>
                <p>
                  <span className="text-muted-foreground">Published: </span>
                  {data.published}
                </p>
                <p>
                  <span className="text-muted-foreground">Featured: </span>
                  {data.featured}
                </p>
                <p>
                  <span className="text-muted-foreground">Enquiries: </span>
                  {data.enquiries}
                </p>
                <p>
                  <span className="text-muted-foreground">Viewings: </span>
                  {data.viewings}
                </p>
              </div>
              {data.items.length === 0 &&
              data.recentEnquiries.length === 0 &&
              data.recentViewings.length === 0 ? (
                <EmptyList label="listings or leads" />
              ) : (
                <ul className="divide-y rounded-lg border">
                  {data.items.map((item) => (
                    <DetailRow
                      key={item.id}
                      href={`/dashboard/listings/${item.id}`}
                      title={item.title}
                      meta={item.location || "Location not set"}
                      badge={
                        <StatusBadge
                          label={item.isPublished ? "Published" : item.status}
                          tone={item.isPublished ? "positive" : "muted"}
                        />
                      }
                    />
                  ))}
                  {data.recentEnquiries.map((enquiry) => (
                    <DetailRow
                      key={enquiry.id}
                      href={`/dashboard/enquiries/${enquiry.id}`}
                      title={enquiry.name}
                      meta={`${enquiry.listing} · ${enquiry.createdAt ? formatDateTime(enquiry.createdAt) : "Date not set"}`}
                      badge={<StatusBadge label={enquiry.status} tone={maintenanceTone(enquiry.status)} />}
                    />
                  ))}
                  {data.recentViewings.map((viewing) => (
                    <DetailRow
                      key={viewing.id}
                      href={`/dashboard/viewings/${viewing.id}`}
                      title={viewing.name}
                      meta={`${viewing.listing} · ${formatDate(viewing.preferredDate)}`}
                      badge={<StatusBadge label={viewing.status} tone={maintenanceTone(viewing.status)} />}
                    />
                  ))}
                </ul>
              )}
            </div>
          )}
        </ReportSection>
      </div>

      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <CircleAlert aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
        Figures are read directly from the same authorized records used by each workspace;
        restricted sections are skipped rather than estimated.
      </p>
    </div>
  );
}
