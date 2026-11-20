import Link from "next/link";
import { setListingPublishedAction } from "@/lib/listings/staff-actions";
import {
  formatListingPrice,
  labelFor,
  LISTING_TYPES,
  PROPERTY_CATEGORIES,
} from "@/lib/listings/constants";
import type { StaffListing } from "@/lib/listings/staff-queries";
import { StatusPill } from "./status-pill";

export function ListingTable({ listings }: { listings: StaffListing[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] text-sm">
        <thead className="border-b text-left text-xs text-muted-foreground">
          <tr>
            <th className="pb-2 pr-4 font-medium">Property</th>
            <th className="pb-2 pr-4 font-medium">Category</th>
            <th className="pb-2 pr-4 font-medium">Price</th>
            <th className="pb-2 pr-4 font-medium">Status</th>
            <th className="pb-2 pr-4 font-medium">Publication</th>
            <th className="pb-2 pr-4 font-medium">Updated</th>
            <th className="pb-2 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {listings.map((listing) => (
            <tr key={listing.id} className="border-b last:border-0">
              <td className="py-3 pr-4">
                <p className="font-medium text-danwell-navy">{listing.title}</p>
                <p className="text-xs text-muted-foreground">
                  {listing.town}, {listing.county} ·{" "}
                  {labelFor(LISTING_TYPES, listing.listing_type)}
                </p>
              </td>
              <td className="py-3 pr-4">
                {labelFor(PROPERTY_CATEGORIES, listing.property_category)}
              </td>
              <td className="py-3 pr-4 font-medium">
                {formatListingPrice(listing.price, listing.price_period, listing.listing_type)}
              </td>
              <td className="py-3 pr-4">
                <StatusPill
                  label={listing.status}
                  tone={listing.status === "active" ? "positive" : "muted"}
                />
              </td>
              <td className="py-3 pr-4">
                <StatusPill
                  label={listing.is_published ? "Published" : "Unpublished"}
                  tone={listing.is_published ? "positive" : "muted"}
                />
                <form
                  action={setListingPublishedAction.bind(
                    null,
                    listing.id,
                    !listing.is_published,
                  )}
                  className="mt-1"
                >
                  <button
                    type="submit"
                    className="text-xs font-medium text-danwell-teal hover:underline"
                  >
                    {listing.is_published ? "Unpublish" : "Publish"}
                  </button>
                </form>
              </td>
              <td className="py-3 pr-4 text-xs text-muted-foreground">
                {listing.updated_at
                  ? new Date(listing.updated_at).toLocaleDateString("en-KE")
                  : "—"}
              </td>
              <td className="py-3">
                <Link
                  href={`/dashboard/listings/${listing.id}`}
                  className="font-medium text-danwell-teal hover:underline"
                >
                  Manage
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
