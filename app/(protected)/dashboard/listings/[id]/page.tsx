import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ListingForm } from "@/components/dashboard/listings/listing-form";
import { AttachmentManager } from "@/components/portfolio/attachment-manager";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { hasPermission } from "@/lib/auth/dal";
import { withPermission } from "@/lib/auth/guards";
import {
  getPropertyOptions,
  getStaffListing,
  getUnitOptions,
} from "@/lib/listings/staff-queries";
import { loadAttachmentViews } from "@/lib/portfolio/attachment-queries";

type ListingDetailProps = {
  params: Promise<{ id: string }>;
};

export default function ListingDetailPage({ params }: ListingDetailProps) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading listing...</p>}>
      <ListingDetailContent params={params} />
    </Suspense>
  );
}

async function ListingDetailContent({ params }: ListingDetailProps) {
  const { id } = await params;

  const data = await withPermission("listings", "edit", async (_context, supabase) => {
    const [listing, properties, units, attachmentViews] = await Promise.all([
      getStaffListing(supabase, id),
      getPropertyOptions(supabase),
      getUnitOptions(supabase),
      loadAttachmentViews(supabase, "listing", id),
    ]);
    return { listing, properties, units, attachmentViews };
  });

  if (!data.listing) {
    notFound();
  }

  const { listing, properties, units, attachmentViews } = data;
  const canDeleteAttachments = await hasPermission("listings", "delete");
  const canPublish =
    (await hasPermission("listings", "publish")) ||
    (await hasPermission("listings", "approve"));
  const isLive = listing.is_published && listing.status === "active";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/dashboard/listings" className="inline-block text-sm text-danwell-teal hover:underline">
          ← Back to listings
        </Link>
        {listing.is_published ? (
          <Link
            href={`/properties/${listing.slug}`}
            target="_blank"
            className="text-sm font-medium text-danwell-teal hover:underline"
          >
            View public page ↗
          </Link>
        ) : null}
      </div>

      <div>
        <p className="text-xs font-medium tracking-wide text-danwell-teal uppercase">
          Sales and marketing
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-danwell-navy">
          {listing.title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Edit approved marketing details. Publication is managed from the
          listings table.
        </p>
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <ListingForm listing={listing} properties={properties} units={units} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-danwell-navy">Listing photos</CardTitle>
          <CardDescription>
            Public images require an active, published listing and publish
            approval. Private files stay outside the public gallery.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AttachmentManager
            entityType="listing"
            entityId={listing.id}
            attachments={attachmentViews}
            revalidatePaths={[
              "/dashboard/listings",
              `/dashboard/listings/${listing.id}`,
              ...(listing.is_published ? [`/properties/${listing.slug}`] : []),
            ]}
            canUpload
            canDelete={canDeleteAttachments}
            allowPublic={canPublish && isLive}
            emptyMessage="No listing photos have been uploaded yet."
          />
        </CardContent>
      </Card>
    </div>
  );
}
