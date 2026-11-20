import { PropertyFilters } from "./property-filters";
import { PropertyGrid } from "./property-grid";
import {
  labelFor,
  LISTING_TYPES,
  type ListingType,
} from "@/lib/listings/constants";
import { getPublishedListings } from "@/lib/listings/queries";
import {
  parseListingFilters,
  type PublicSearchParams,
} from "@/lib/listings/validation";

const copy: Record<
  ListingType,
  { eyebrow: string; title: string; description: string }
> = {
  rent: {
    eyebrow: "Properties for rent",
    title: "Find your next home or business space",
    description:
      "Search approved rental listings across Kenya. Filter by location, property type, price and bedrooms.",
  },
  sale: {
    eyebrow: "Properties for sale",
    title: "Invest in your next property",
    description:
      "Browse approved properties for sale, from homes and apartments to land and commercial spaces.",
  },
};

export async function PropertyListView({
  category,
  searchParams,
}: {
  category: ListingType;
  searchParams: Promise<PublicSearchParams>;
}) {
  const params = await searchParams;
  const filters = parseListingFilters(category, params);
  const [listings, allListings] = await Promise.all([
    getPublishedListings(filters),
    getPublishedListings(parseListingFilters(category, {})),
  ]);

  const counties = Array.from(
    new Set(allListings.map((listing) => listing.county)),
  ).sort();

  const text = copy[category];

  return (
    <>
      <section className="border-b border-danwell-navy/10 bg-danwell-navy text-white">
        <div className="mx-auto w-full max-w-7xl px-4 py-14">
          <p className="text-sm font-semibold tracking-wide text-danwell-gold uppercase">
            {text.eyebrow}
          </p>
          <h1 className="mt-2 max-w-3xl text-4xl font-semibold tracking-tight">
            {text.title}
          </h1>
          <p className="mt-4 max-w-2xl text-white/75">{text.description}</p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-10">
        <PropertyFilters category={category} filters={filters} counties={counties} />

        <div className="mt-8 flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-xl font-semibold text-danwell-navy">
            {listings.length} {labelFor(LISTING_TYPES, category).toLowerCase()}{" "}
            {listings.length === 1 ? "property" : "properties"}
          </h2>
          <p className="text-sm text-muted-foreground">
            Only published and available listings are shown.
          </p>
        </div>

        <div className="mt-6">
          <PropertyGrid
            listings={listings}
            emptyTitle="No matching properties"
            emptyMessage="Try a wider price range or a different location. You may also send Danwell an enquiry with your requirements."
          />
        </div>
      </section>
    </>
  );
}
