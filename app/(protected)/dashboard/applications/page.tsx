import { Suspense } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/portfolio/empty-state";
import { StatusBadge } from "@/components/portfolio/status-badge";
import { Button } from "@/components/ui/button";
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
  statusFilter,
} from "@/lib/tenancy/constants";
import { getApplications } from "@/lib/tenancy/queries";

type ApplicationsPageProps = {
  searchParams: Promise<{ status?: string | string[] }>;
};

export default function ApplicationsPage({ searchParams }: ApplicationsPageProps) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading applications...</p>}>
      <ApplicationsContent searchParams={searchParams} />
    </Suspense>
  );
}

async function ApplicationsContent({ searchParams }: ApplicationsPageProps) {
  const params = await searchParams;
  const status = statusFilter(params.status, APPLICATION_STATUSES);
  const applications = await withPermission("tenants", "view", async (_context, supabase) =>
    getApplications(supabase, status),
  );
  const canCreate = await hasPermission("tenants", "create");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium tracking-[0.18em] text-danwell-teal uppercase">
            Tenancy
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-danwell-navy">
            Rental applications
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review applicants and hand approved applications off to lease creation.
          </p>
        </div>
        {canCreate ? (
          <Button asChild>
            <Link href="/dashboard/applications/new">New application</Link>
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/dashboard/applications"
          className={`rounded-full border px-3 py-1 text-xs ${
            status
              ? "border-border text-muted-foreground hover:bg-muted"
              : "border-danwell-navy bg-danwell-navy text-white"
          }`}
        >
          All
        </Link>
        {APPLICATION_STATUSES.map((option) => (
          <Link
            key={option.value}
            href={`/dashboard/applications?status=${option.value}`}
            className={`rounded-full border px-3 py-1 text-xs ${
              status === option.value
                ? "border-danwell-navy bg-danwell-navy text-white"
                : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            {option.label}
          </Link>
        ))}
      </div>

      {applications.length === 0 ? (
        <EmptyState
          title="No applications found"
          description={
            status
              ? "No applications match this status filter."
              : "Record a rental application for an available unit."
          }
          href={canCreate ? "/dashboard/applications/new" : undefined}
          actionLabel={canCreate ? "New application" : undefined}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-danwell-navy">
              Application register
            </CardTitle>
            <CardDescription>{applications.length} application(s)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="border-b text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="pb-2 font-medium">Applicant</th>
                    <th className="pb-2 font-medium">Unit</th>
                    <th className="pb-2 font-medium">Applied</th>
                    <th className="pb-2 font-medium">Proposed rent</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map((application) => (
                    <tr key={application.id} className="border-b last:border-0">
                      <td className="py-3 pr-4 font-medium">
                        {application.applicant_full_name}
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {application.applicant_phone}
                        </p>
                      </td>
                      <td className="py-3 pr-4">
                        {application.units?.unit_number ?? "Unit record"}
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {application.units?.properties?.title ?? "Property record"}
                        </p>
                      </td>
                      <td className="py-3 pr-4">{formatDate(application.application_date)}</td>
                      <td className="py-3 pr-4">{formatMoney(application.proposed_rent)}</td>
                      <td className="py-3 pr-4">
                        <StatusBadge
                          label={labelFor(APPLICATION_STATUSES, application.status)}
                          tone={applicationStatusTone(application.status)}
                        />
                      </td>
                      <td className="py-3 text-right">
                        <Link
                          href={`/dashboard/applications/${application.id}`}
                          className="rounded-lg border px-2.5 py-1 text-xs hover:bg-muted"
                        >
                          Review
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
