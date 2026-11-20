import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AttachmentManager } from "@/components/portfolio/attachment-manager";
import { StatusBadge } from "@/components/portfolio/status-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { hasPermission } from "@/lib/auth/dal";
import { withPermission } from "@/lib/auth/guards";
import { loadAttachmentViews } from "@/lib/portfolio/attachment-queries";
import { labelFor } from "@/lib/portfolio/constants";
import {
  formatDate,
  formatMoney,
  isCurrentLeaseStatus,
  LEASE_STATUSES,
  leaseStatusTone,
} from "@/lib/tenancy/constants";
import { getLease } from "@/lib/tenancy/queries";

type LeaseDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default function LeaseDetailPage({ params }: LeaseDetailPageProps) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading lease...</p>}>
      <LeaseDetailContent params={params} />
    </Suspense>
  );
}

async function LeaseDetailContent({ params }: LeaseDetailPageProps) {
  const { id } = await params;
  const detail = await withPermission("leases", "view", async (_context, supabase) => {
    const lease = await getLease(supabase, id);
    if (!lease) {
      return null;
    }
    const attachmentViews = await loadAttachmentViews(supabase, "lease", id);
    return { lease, attachmentViews };
  });

  if (!detail) {
    notFound();
  }

  const { lease, attachmentViews } = detail;
  const canEdit = await hasPermission("leases", "edit");
  const canCreate = await hasPermission("leases", "create");
  const canDeleteAttachments = await hasPermission("leases", "delete");
  const canViewPayments = await hasPermission("payments", "view");
  const canRecordPayment = await hasPermission("payments", "create");
  const canViewDeposits = await hasPermission("deposits", "view");
  const canRenew =
    canCreate &&
    (isCurrentLeaseStatus(lease.status) || lease.status === "expired");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link
            href="/dashboard/leases"
            className="text-sm text-danwell-teal hover:underline"
          >
            ← Back to leases
          </Link>
          <h1 className="mt-3 text-2xl font-semibold text-danwell-navy">
            {lease.units?.unit_number ?? "Lease"} lease
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <StatusBadge
              label={labelFor(LEASE_STATUSES, lease.status)}
              tone={leaseStatusTone(lease.status)}
            />
            <span className="text-sm text-muted-foreground">
              {formatDate(lease.start_date)} – {formatDate(lease.end_date)}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {canEdit ? (
            <Link
              href={`/dashboard/leases/${lease.id}/edit`}
              className="inline-flex h-8 items-center rounded-lg border px-3 text-sm font-medium hover:bg-muted"
            >
              Edit lease
            </Link>
          ) : null}
          {canRenew ? (
            <Link
              href={`/dashboard/leases/${lease.id}/renew`}
              className="inline-flex h-8 items-center rounded-lg bg-danwell-navy px-3 text-sm font-medium text-white hover:bg-danwell-navy/90"
            >
              Renew lease
            </Link>
          ) : null}
        </div>
      </div>

      {canViewPayments || canViewDeposits || canRecordPayment ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-danwell-navy">Financial records</CardTitle>
            <CardDescription>
              Statements, payments and deposits linked to this lease.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {canViewPayments ? (
              <Link
                href={`/dashboard/finance/statements?leaseId=${lease.id}`}
                className="inline-flex h-8 items-center rounded-lg bg-danwell-navy px-3 text-sm font-medium text-white hover:bg-danwell-navy/90"
              >
                View statement
              </Link>
            ) : null}
            {canRecordPayment ? (
              <Link
                href={`/dashboard/finance/payments/new?lease=${lease.id}`}
                className="inline-flex h-8 items-center rounded-lg border px-3 text-sm font-medium hover:bg-muted"
              >
                Record payment
              </Link>
            ) : null}
            {canViewDeposits ? (
              <Link
                href={`/dashboard/finance/deposits?lease=${lease.id}`}
                className="inline-flex h-8 items-center rounded-lg border px-3 text-sm font-medium hover:bg-muted"
              >
                Deposits
              </Link>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-danwell-navy">Lease terms</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4 text-sm">
              <Detail label="Monthly rent" value={formatMoney(lease.monthly_rent)} />
              <Detail
                label="Security deposit"
                value={lease.security_deposit_required ? "Required" : "Not required"}
              />
              <Detail label="Rent due day" value={`Day ${lease.rent_due_day}`} />
              <Detail label="Special terms" value={lease.special_terms || "None"} />
              <Detail label="Notes" value={lease.notes || "None"} />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-danwell-navy">Parties and property</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4 text-sm">
              <Detail
                label="Tenant"
                value={
                  <Link
                    href={`/dashboard/tenants/${lease.tenant_id}`}
                    className="text-danwell-teal hover:underline"
                  >
                    {lease.tenants?.full_name ?? "Tenant record"}
                  </Link>
                }
              />
              <Detail
                label="Unit"
                value={
                  <Link
                    href={`/dashboard/properties/${lease.units?.property_id}/units/${lease.unit_id}/edit`}
                    className="text-danwell-teal hover:underline"
                  >
                    {lease.units?.unit_number ?? "Unit record"}
                  </Link>
                }
              />
              <Detail
                label="Property"
                value={lease.units?.properties?.title ?? "Property record"}
              />
              <Detail
                label="Source application"
                value={
                  lease.source_application_id ? (
                    <Link
                      href={`/dashboard/applications/${lease.source_application_id}`}
                      className="text-danwell-teal hover:underline"
                    >
                      View application
                    </Link>
                  ) : (
                    "None"
                  )
                }
              />
              <Detail
                label="Renewal of"
                value={
                  lease.renewal_of ? (
                    <Link
                      href={`/dashboard/leases/${lease.renewal_of}`}
                      className="text-danwell-teal hover:underline"
                    >
                      View previous lease
                    </Link>
                  ) : (
                    "None"
                  )
                }
              />
            </dl>
          </CardContent>
        </Card>
      </div>

      {lease.status === "terminated" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-danwell-navy">Termination</CardTitle>
            <CardDescription>Recorded reason and effective date.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2 text-sm">
              <Detail label="Termination date" value={formatDate(lease.terminated_on)} />
              <Detail
                label="Reason"
                value={lease.termination_reason || "Not provided"}
              />
            </dl>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-danwell-navy">Lease documents</CardTitle>
          <CardDescription>
            Signed agreements and related files. Only staff with lease access
            can see or manage these documents.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AttachmentManager
            entityType="lease"
            entityId={lease.id}
            attachments={attachmentViews}
            revalidatePaths={[
              "/dashboard/leases",
              `/dashboard/leases/${lease.id}`,
            ]}
            canUpload={canEdit}
            canDelete={canDeleteAttachments}
            emptyMessage="No lease documents have been uploaded yet."
          />
        </CardContent>
      </Card>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-foreground">{value}</dd>
    </div>
  );
}
