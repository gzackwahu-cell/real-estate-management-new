import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/portfolio/status-badge";
import { ApplicationReviewForm } from "@/components/tenancy/application-review-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { hasPermission } from "@/lib/auth/dal";
import { withPermission } from "@/lib/auth/guards";
import { labelFor } from "@/lib/portfolio/constants";
import {
  APPLICATION_STATUSES,
  applicationStatusTone,
  formatDate,
  formatMoney,
  isOpenApplicationStatus,
} from "@/lib/tenancy/constants";
import { getApplication } from "@/lib/tenancy/queries";

type ApplicationDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default function ApplicationDetailPage({ params }: ApplicationDetailPageProps) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading application...</p>}>
      <ApplicationDetailContent params={params} />
    </Suspense>
  );
}

async function ApplicationDetailContent({ params }: ApplicationDetailPageProps) {
  const { id } = await params;
  const application = await withPermission("tenants", "view", async (_context, supabase) =>
    getApplication(supabase, id),
  );

  if (!application) {
    notFound();
  }

  const canReview = await hasPermission("tenants", "approve");
  const canCreateLease = await hasPermission("leases", "create");
  const leaseParams = new URLSearchParams({
    application: application.id,
    tenant: application.tenant_id ?? "",
    unit: application.unit_id,
  });
  const leaseHref = `/dashboard/leases/new?${leaseParams.toString()}`;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/applications"
          className="text-sm text-danwell-teal hover:underline"
        >
          ← Back to applications
        </Link>
        <h1 className="mt-3 text-2xl font-semibold text-danwell-navy">
          {application.applicant_full_name}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <StatusBadge
            label={labelFor(APPLICATION_STATUSES, application.status)}
            tone={applicationStatusTone(application.status)}
          />
          <span className="text-sm text-muted-foreground">
            Applied {formatDate(application.application_date)}
          </span>
        </div>
      </div>

      {application.status === "approved" && application.tenant_id ? (
        <div className="rounded-lg border border-danwell-teal/25 bg-danwell-teal/10 px-4 py-3 text-sm">
          <p className="font-medium text-danwell-navy">Next step: create a lease</p>
          <p className="mt-1 text-muted-foreground">
            Approval created or linked the tenant record only. No lease was
            created automatically.
          </p>
          {canCreateLease ? (
            <Link
              href={leaseHref}
              className="mt-3 inline-flex h-8 items-center rounded-lg bg-danwell-navy px-3 text-sm font-medium text-white hover:bg-danwell-navy/90"
            >
              Create lease
            </Link>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-danwell-navy">Applicant details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4 text-sm">
              <Detail label="Full name" value={application.applicant_full_name} />
              <Detail label="Phone" value={application.applicant_phone} />
              <Detail label="Email" value={application.applicant_email || "Not provided"} />
              <Detail label="National ID / reference" value={application.applicant_id_reference} />
              <Detail label="Address" value={application.applicant_address || "Not provided"} />
              <Detail label="Proposed rent" value={formatMoney(application.proposed_rent)} />
              <Detail label="Notes" value={application.notes || "Not provided"} />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-danwell-navy">Preferred unit</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4 text-sm">
              <Detail
                label="Unit"
                value={application.units?.unit_number ?? "Unit record"}
              />
              <Detail
                label="Property"
                value={application.units?.properties?.title ?? "Property record"}
              />
              <Detail
                label="Unit rent"
                value={
                  application.units?.monthly_rent !== undefined
                    ? formatMoney(application.units.monthly_rent)
                    : "Not provided"
                }
              />
              <Detail
                label="Linked tenant"
                value={
                  application.tenants ? (
                    <Link
                      href={`/dashboard/tenants/${application.tenants.id}`}
                      className="text-danwell-teal hover:underline"
                    >
                      {application.tenants.full_name}
                    </Link>
                  ) : (
                    "Not linked"
                  )
                }
              />
            </dl>
          </CardContent>
        </Card>
      </div>

      {canReview && isOpenApplicationStatus(application.status) ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-danwell-navy">Review application</CardTitle>
            <CardDescription>
              Approval never creates a lease automatically.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ApplicationReviewForm application={application} />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-danwell-navy">Decision</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4 text-sm">
              <Detail label="Decision notes" value={application.decision_notes || "Not provided"} />
              <Detail label="Decided" value={formatDate(application.decided_at?.slice(0, 10))} />
            </dl>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-foreground">{value}</dd>
    </div>
  );
}
