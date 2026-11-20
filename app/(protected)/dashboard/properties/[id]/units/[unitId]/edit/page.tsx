import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AttachmentManager } from "@/components/portfolio/attachment-manager";
import { UnitForm } from "@/components/portfolio/unit-form";
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
import { getProperty, getUnit } from "@/lib/portfolio/queries";
import { getUnitLeases } from "@/lib/tenancy/queries";

type EditUnitPageProps = {
  params: Promise<{ id: string; unitId: string }>;
};

export default function EditUnitPage({ params }: EditUnitPageProps) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading unit...</p>}>
      <EditUnitContent params={params} />
    </Suspense>
  );
}

async function EditUnitContent({ params }: EditUnitPageProps) {
  const { id, unitId } = await params;
  const property = await withPermission("properties", "view", async (_context, supabase) =>
    getProperty(supabase, id),
  );
  if (!property) {
    notFound();
  }

  const canViewLeases = await hasPermission("leases", "view");
  const canViewFinance = await hasPermission("payments", "view");
  const canUploadAttachments = await hasPermission("units", "edit");
  const canDeleteAttachments = await hasPermission("units", "delete");
  const [unit, leases, attachmentViews] = await withPermission(
    "units",
    "edit",
    async (_context, supabase) => {
      const unit = await getUnit(supabase, id, unitId);
      if (!unit) {
        return [null, [], []] as const;
      }

      const leases = canViewLeases ? await getUnitLeases(supabase, unitId) : [];
      const attachmentViews = await loadAttachmentViews(
        supabase,
        "unit",
        unitId,
      );
      return [unit, leases, attachmentViews] as const;
    },
  );

  if (!unit) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href={`/dashboard/properties/${property.id}`}
          className="text-sm text-danwell-teal hover:underline"
        >
          ← Back to property
        </Link>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-danwell-navy">Edit unit</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {property.title} · {unit.unit_number}
            </p>
          </div>
          {canViewFinance ? (
            <Link
              href={`/dashboard/finance?unitId=${unit.id}`}
              className="inline-flex h-8 items-center rounded-lg border px-3 text-sm font-medium hover:bg-muted"
            >
              View finances
            </Link>
          ) : null}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-danwell-navy">
            {unit.unit_number}
          </CardTitle>
          <CardDescription>
            Deactivate the unit instead of deleting rental history later.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UnitForm propertyId={property.id} unit={unit} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-danwell-navy">
            Unit attachments
          </CardTitle>
          <CardDescription>
            Private files linked to this unit. Public marketing images belong
            on the property or published listing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AttachmentManager
            entityType="unit"
            entityId={unit.id}
            attachments={attachmentViews}
            revalidatePaths={[
              `/dashboard/properties/${property.id}`,
              `/dashboard/properties/${property.id}/units/${unit.id}/edit`,
            ]}
            canUpload={canUploadAttachments}
            canDelete={canDeleteAttachments}
            emptyMessage="No unit attachments have been uploaded yet."
          />
        </CardContent>
      </Card>

      {canViewLeases ? (
        <LeaseSummary
          leases={leases}
          title="Unit lease history"
          description="Lease records linked to this unit."
          showTenant
          emptyMessage="No leases have been linked to this unit."
        />
      ) : null}
    </div>
  );
}
