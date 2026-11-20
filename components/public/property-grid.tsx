import { Building2 } from "lucide-react";
import { PropertyCard } from "./property-card";
import { getListingImages } from "@/lib/listings/queries";
import type { PublicListing } from "@/lib/listings/validation";

export async function PropertyGrid({
  listings,
  emptyTitle = "No properties found",
  emptyMessage = "Try adjusting your filters or contact Danwell for new listings.",
}: {
  listings: PublicListing[];
  emptyTitle?: string;
  emptyMessage?: string;
}) {
  if (listings.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-danwell-navy/20 bg-white p-12 text-center">
        <Building2 aria-hidden="true" className="mx-auto size-10 text-danwell-teal" />
        <h2 className="mt-4 text-lg font-semibold text-danwell-navy">{emptyTitle}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          {emptyMessage}
        </p>
      </div>
    );
  }

  const cards = await Promise.all(
    listings.map(async (listing) => ({
      listing,
      images: await getListingImages(listing.id, listing.property_id),
    })),
  );

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map(({ listing, images }, index) => (
        <PropertyCard
          key={listing.id}
          listing={listing}
          images={images}
          priority={index < 3}
        />
      ))}
    </div>
  );
}

export function PropertyGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="overflow-hidden rounded-2xl border border-danwell-navy/10 bg-white"
        >
          <div className="aspect-[4/3] animate-pulse bg-danwell-navy/10" />
          <div className="space-y-3 p-5">
            <div className="h-4 w-24 animate-pulse rounded bg-danwell-navy/10" />
            <div className="h-5 w-3/4 animate-pulse rounded bg-danwell-navy/10" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-danwell-navy/10" />
            <div className="h-10 animate-pulse rounded-lg bg-danwell-navy/10" />
          </div>
        </div>
      ))}
    </div>
  );
}
