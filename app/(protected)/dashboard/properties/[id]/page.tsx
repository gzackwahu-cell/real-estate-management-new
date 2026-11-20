import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AttachmentManager } from "@/components/portfolio/attachment-manager";
import { StatusBadge } from "@/components/portfolio/status-badge";
import { LeaseSummary } from "@/components/tenancy/lease-summary";
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
import {
  OCCUPANCY_STATUSES,
  PROPERTY_STATUSES,
  PROPERTY_TYPES,
  UNIT_TYPES,
  labelFor,
} from "@/lib/portfolio/constants";
import { getPropertyDetail } from "@/lib/portfolio/queries";
import { getPropertyLeases } from "@/lib/tenancy/queries";

type PropertyDetailPageProps = {
  params: Promise<{ id: string }>;
};

const moneyFormatter = new Intl.NumberFormat("en-KE", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export default function PropertyDetailPage({ params }: PropertyDetailPageProps) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading property...</p>}>
      <PropertyDetailContent params={params} />
    </Suspense>
  );
}

async function PropertyDetailContent({ params }: PropertyDetailPageProps) {
  const { id } = await params;
  const canPublish =
    (await hasPermission("listings", "publish")) ||
    (await hasPermission("listings", "approve"));

  const detail = await withPermission(
    "properties",
    "view",
    async (_context, supabase) => {
      const propertyDetail = await getPropertyDetail(supabase, id);
      if (!propertyDetail) {
        return null;
      }

      const canViewLeases = await hasPermission("leases", "view");
      const leases = canViewLeases ? await getPropertyLeases(supabase, id) : [];
      const attachmentViews = await loadAttachmentViews(supabase, "property", id);
      const { data: approvedListing } = await supabase
        .from("listings")
        .select("slug")
        .eq("property_id", id)
        .eq("is_published", true)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();

      return {
        ...propertyDetail,
        leases,
        canViewLeases,
        attachmentViews,
        approvedListingSlug: approvedListing?.slug ?? null,
      };
    },
  );

  if (!detail) {
    notFound();
  }

  const canEditProperty = await hasPermission("properties", "edit");
  const canCreateUnit = await hasPermission("units", "create");
  const canEditUnit = await hasPermission("units", "edit");
  const canViewFinance = await hasPermission("payments", "view");
  const canUploadAttachments = await hasPermission("properties", "edit");
  const canDeleteAttachments = await hasPermission("properties", "delete");
  const {
    property,
    owners,
    units,
    leases,
    canViewLeases,
    attachmentViews,
    approvedListingSlug,
  } = detail;
  const estate = property.estate ? `, ${property.estate}` : "";
  const revalidatePaths = [
    "/dashboard/properties",
    `/dashboard/properties/${property.id}`,
    `/owner/properties/${property.id}`,
    ...(approvedListingSlug ? [`/properties/${approvedListingSlug}`] : []),
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link
            href="/dashboard/properties"
            className="text-sm text-danwell-teal hover:underline"
          >
            ← Back to properties
          </Link>
          <h1 className="mt-3 text-2xl font-semibold text-danwell-navy">
            {property.title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {labelFor(PROPERTY_TYPES, property.property_type)} · {property.county},{" "}
            {property.town}
            {estate}
          </p>
          <div className="mt-2">
            <StatusBadge
              label={labelFor(PROPERTY_STATUSES, property.status)}
              tone={
                property.status === "active"
                  ? "positive"
                  : property.status === "maintenance"
                    ? "warning"
                    : "muted"
              }
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {canEditProperty ? (
            <Link
              href={`/dashboard/properties/${property.id}/edit`}
              className="inline-flex h-8 items-center rounded-lg border px-3 text-sm font-medium hover:bg-muted"
            >
              Edit property
            </Link>
          ) : null}
          {canViewFinance ? (
            <Link
              href={`/dashboard/finance?propertyId=${property.id}`}
              className="inline-flex h-8 items-center rounded-lg border px-3 text-sm font-medium hover:bg-muted"
            >
              View finances
            </Link>
          ) : null}
          {canCreateUnit ? (
            <Link
              href={`/dashboard/properties/${property.id}/units/new`}
              className="inline-flex h-8 items-center rounded-lg bg-danwell-navy px-3 text-sm font-medium text-white hover:bg-danwell-navy/90"
            >
              Add unit
            </Link>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg text-danwell-navy">Property details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2">
              <Detail label="Physical address" value={property.physical_address} />
              <Detail
                label="Town / county"
                value={`${property.town}, ${property.county}`}
              />
              <Detail
                label="Estate"
                value={property.estate || "Not provided"}
              />
              <Detail
                label="Description"
                value={property.description || "Not provided"}
              />
              <Detail
                label="Directions"
                value={property.directions || "Not provided"}
                className="sm:col-span-2"
              />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-danwell-navy">Ownership</CardTitle>
            <CardDescription>{owners.length} owner record(s)</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {owners.map((assignment) => (
                <li
                  key={`${assignment.owner_id}-${assignment.property_id}`}
                  className="rounded-lg border bg-muted/30 px-3 py-2"
                >
                  <Link
                    href={`/dashboard/owners/${assignment.owner_id}`}
                    className="font-medium text-danwell-navy hover:underline"
                  >
                    {assignment.owners?.full_name ?? "Owner record"}
                  </Link>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {assignment.is_primary ? (
                      <StatusBadge label="Primary" tone="positive" />
                    ) : null}
                    <span className="text-xs text-muted-foreground">
                      {assignment.ownership_percentage === null
                        ? "Percentage pending"
                        : `${assignment.ownership_percentage}%`}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {assignment.verification_status}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-danwell-navy">Units</CardTitle>
          <CardDescription>
            {units.length} unit(s) registered on this property
          </CardDescription>
        </CardHeader>
        <CardContent>
          {units.length === 0 ? (
            <div className="rounded-lg border border-dashed px-4 py-6 text-center">
              <p className="text-sm text-muted-foreground">
                No units have been added to this property.
              </p>
              {canCreateUnit ? (
                <Link
                  href={`/dashboard/properties/${property.id}/units/new`}
                  className="mt-3 inline-flex h-8 items-center rounded-lg bg-danwell-navy px-3 text-sm font-medium text-white hover:bg-danwell-navy/90"
                >
                  Add first unit
                </Link>
              ) : null}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="border-b text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="pb-2 font-medium">Unit</th>
                    <th className="pb-2 font-medium">Type</th>
                    <th className="pb-2 font-medium">Monthly rent</th>
                    <th className="pb-2 font-medium">Deposit</th>
                    <th className="pb-2 font-medium">Occupancy</th>
                    <th className="pb-2 font-medium">Status</th>
                    {canEditUnit ? (
                      <th className="pb-2 text-right font-medium">Action</th>
                    ) : null}
                  </tr>
                </thead>
                <tbody>
                  {units.map((unit) => (
                    <tr key={unit.id} className="border-b last:border-0">
                      <td className="py-3 pr-4 font-medium">{unit.unit_number}</td>
                      <td className="py-3 pr-4">
                        {labelFor(UNIT_TYPES, unit.unit_type)}
                      </td>
                      <td className="py-3 pr-4">
                        KES {moneyFormatter.format(unit.monthly_rent)}
                      </td>
                      <td className="py-3 pr-4">
                        {unit.deposit_required ? "Required" : "Not required"}
                      </td>
                      <td className="py-3 pr-4">
                        <StatusBadge
                          label={labelFor(OCCUPANCY_STATUSES, unit.occupancy_status)}
                          tone={
                            unit.occupancy_status === "occupied"
                              ? "warning"
                              : unit.occupancy_status === "vacant"
                                ? "positive"
                                : "muted"
                          }
                        />
                      </td>
                      <td className="py-3 pr-4">
                        <StatusBadge
                          label={unit.is_active ? "Active" : "Inactive"}
                          tone={unit.is_active ? "positive" : "muted"}
                        />
                      </td>
                      {canEditUnit ? (
                        <td className="py-3 text-right">
                          <Link
                            href={`/dashboard/properties/${property.id}/units/${unit.id}/edit`}
                            className="rounded-lg border px-2.5 py-1 text-xs hover:bg-muted"
                          >
                            Edit
                          </Link>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {canViewLeases ? (
        <LeaseSummary
          leases={leases}
          title="Leases"
          description="Lease records linked to units on this property."
          showTenant
          emptyMessage="No leases have been linked to units on this property."
        />
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-danwell-navy">Images & documents</CardTitle>
          <CardDescription>
            Private files stay in the private bucket. Public marketing images
            require a published listing and publish approval.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AttachmentManager
            entityType="property"
            entityId={property.id}
            attachments={attachmentViews}
            revalidatePaths={revalidatePaths}
            canUpload={canUploadAttachments}
            canDelete={canDeleteAttachments}
            allowPublic={canPublish && Boolean(approvedListingSlug)}
            emptyMessage="No property files have been uploaded yet."
          />
        </CardContent>
      </Card>
    </div>
  );
}

function Detail({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm text-foreground">{value}</dd>
    </div>
  );
}
