import { AttachmentList } from "@/components/portfolio/attachment-list";
import { StatusBadge } from "@/components/portfolio/status-badge";
import { PortalDetail, PortalDetailList } from "@/components/portal/portal-detail-list";
import type { AttachmentView } from "@/lib/portfolio/attachment-queries";
import {
  formatDate,
  formatMoney,
  LEASE_STATUSES,
  leaseStatusTone,
} from "@/lib/tenancy/constants";
import { labelFor } from "@/lib/portfolio/constants";
import type { LeaseRecord } from "@/lib/tenancy/validation";

export function TenantLeaseCards({
  leases,
  leaseAttachments,
  emptyMessage,
}: {
  leases: LeaseRecord[];
  leaseAttachments?: Record<string, AttachmentView[]>;
  emptyMessage: string;
}) {
  if (leases.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-4">
      {leases.map((lease) => {
        const unit = lease.units;
        const property = unit?.properties;

        return (
          <div key={lease.id} className="rounded-lg border bg-muted/30 px-4 py-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium text-danwell-navy">
                  {property?.title ?? "Property"} · {unit?.unit_number ?? "Unit"}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {property ? [property.town, property.county].filter(Boolean).join(", ") : "Property details unavailable"}
                </p>
              </div>
              <StatusBadge
                label={labelFor(LEASE_STATUSES, lease.status)}
                tone={leaseStatusTone(lease.status)}
              />
            </div>

            <PortalDetailList columns="sm:grid-cols-2 lg:grid-cols-4" >
              <PortalDetail
                label="Lease term"
                value={`${formatDate(lease.start_date)} – ${formatDate(lease.end_date)}`}
              />
              <PortalDetail
                label="Monthly rent"
                value={formatMoney(lease.monthly_rent)}
              />
              <PortalDetail label="Rent due day" value={`Day ${lease.rent_due_day}`} />
              <PortalDetail
                label="Security deposit"
                value={lease.security_deposit_required ? "Required" : "Not required"}
              />
            </PortalDetailList>

            {lease.special_terms ? (
              <p className="mt-4 text-xs text-muted-foreground">
                Special terms: {lease.special_terms}
              </p>
            ) : null}

            <div className="mt-4 border-t pt-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Lease documents
              </p>
              <AttachmentList
                attachments={leaseAttachments?.[lease.id] ?? []}
                emptyMessage="No documents have been attached to this lease."
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
