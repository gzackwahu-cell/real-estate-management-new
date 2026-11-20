import Image from "next/image";
import Link from "next/link";
import { Building2 } from "lucide-react";
import {
  formatListingPrice,
  labelFor,
  listingLocation,
  LISTING_TYPES,
  PROPERTY_CATEGORIES,
} from "@/lib/listings/constants";
import type { ListingImage, PublicListing } from "@/lib/listings/validation";

type PropertyCardProps = {
  listing: PublicListing;
  images?: ListingImage[];
  priority?: boolean;
};

export function PropertyCard({
  listing,
  images = [],
  priority = false,
}: PropertyCardProps) {
  const image = images.find((item) => item.is_primary) ?? images[0];
  const detailHref = `/properties/${listing.slug}`;
  const price = formatListingPrice(
    listing.price,
    listing.price_period,
    listing.listing_type,
  );

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-danwell-navy/10 bg-white shadow-sm transition-shadow hover:shadow-lg">
      <Link href={detailHref} className="relative block aspect-[4/3] overflow-hidden bg-danwell-navy/5">
        {image ? (
          <Image
            src={image.url}
            alt={image.caption || listing.title}
            fill
            unoptimized
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            priority={priority}
          />
        ) : (
          <span className="flex size-full items-center justify-center bg-gradient-to-br from-danwell-navy/10 via-danwell-teal/10 to-danwell-gold/20 text-danwell-navy/40">
            <Building2 aria-hidden="true" className="size-12" />
          </span>
        )}
        <span className="absolute top-3 left-3 rounded-full bg-danwell-navy px-3 py-1 text-xs font-semibold text-danwell-gold">
          {labelFor(LISTING_TYPES, listing.listing_type)}
        </span>
        {listing.is_featured ? (
          <span className="absolute top-3 right-3 rounded-full bg-danwell-gold px-3 py-1 text-xs font-semibold text-danwell-navy">
            Featured
          </span>
        ) : null}
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs font-medium tracking-wide text-danwell-teal uppercase">
          {labelFor(PROPERTY_CATEGORIES, listing.property_category)}
        </p>
        <h3 className="mt-1 text-lg font-semibold text-danwell-navy">
          <Link href={detailHref} className="hover:underline">
            {listing.title}
          </Link>
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {listingLocation(listing)}
        </p>

        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-danwell-navy">
          {listing.bedrooms !== null ? (
            <span>{listing.bedrooms} bed{listing.bedrooms === 1 ? "" : "s"}</span>
          ) : null}
          {listing.bathrooms !== null ? (
            <span>{listing.bathrooms} bath{listing.bathrooms === 1 ? "" : "s"}</span>
          ) : null}
        </div>

        <p className="mt-3 text-xl font-semibold text-danwell-navy">{price}</p>

        <Link
          href={detailHref}
          className="mt-5 inline-flex w-full items-center justify-center rounded-lg bg-danwell-navy px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-danwell-teal"
        >
          View details
        </Link>
      </div>
    </article>
  );
}
