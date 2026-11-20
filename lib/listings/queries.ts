import "server-only";

import { z } from "zod";
import { PUBLIC_STORAGE_BUCKET } from "./constants";
import type { SitemapListing } from "./sitemap-core";
import { createPublicListingClient } from "./supabase";
import {
  listingImageRowSchema,
  publicListingRowSchema,
  type ListingFilters,
  type ListingImage,
  type PublicListing,
} from "./validation";

/** Only approved marketing fields are selected for anonymous visitors. */
const PUBLIC_LISTING_FIELDS = `
  id, slug, listing_type, property_category, status, is_published,
  is_featured, managed_by_agency, property_id, unit_id, title, description,
  county, town, estate, physical_address, bedrooms, bathrooms, price,
  price_period, features, created_at, updated_at
`;

const SITEMAP_PAGE_SIZE = 1000;
const SITEMAP_MAX_URLS = 50_000;

const publicListingsSchema = z.array(publicListingRowSchema);
const listingOptionSchema = z.object({
  slug: z.string(),
  title: z.string(),
  listing_type: z.enum(["rent", "sale"]),
  town: z.string(),
  county: z.string(),
});
const sitemapListingSchema = z.object({
  slug: z.string(),
  updated_at: z.string().nullish(),
  created_at: z.string().nullish(),
});

export type PublishedListingOption = z.infer<typeof listingOptionSchema>;

function sanitizeLike(value: string): string {
  return value.replace(/[%,()\\]/g, " ").replace(/\s+/g, " ").trim();
}

type ListingQueryResult = {
  data: unknown[] | null;
  error: { message: string } | null;
};

async function loadListings(
  build: (
    client: ReturnType<typeof createPublicListingClient>,
  ) => PromiseLike<ListingQueryResult>,
): Promise<PublicListing[]> {
  try {
    const client = createPublicListingClient();
    const { data, error } = await build(client);
    if (error || !data) {
      return [];
    }
    return publicListingsSchema.parse(data);
  } catch {
    // A missing prepared migration or an unavailable database renders an empty
    // public listing state rather than an internal error page.
    return [];
  }
}

export async function getPublishedListings(
  filters: ListingFilters,
): Promise<PublicListing[]> {
  return loadListings((client) => {
    let query = client
      .from("listings")
      .select(PUBLIC_LISTING_FIELDS)
      .eq("is_published", true)
      .eq("status", "active")
      .eq("listing_type", filters.category);

    if (filters.county) {
      query = query.ilike("county", `%${sanitizeLike(filters.county)}%`);
    }
    if (filters.location) {
      const safe = sanitizeLike(filters.location);
      if (safe) {
        query = query.or(
          `town.ilike.%${safe}%,estate.ilike.%${safe}%,title.ilike.%${safe}%`,
        );
      }
    }
    if (filters.propertyType) {
      query = query.eq("property_category", filters.propertyType);
    }
    if (filters.minPrice !== null) {
      query = query.gte("price", filters.minPrice);
    }
    if (filters.maxPrice !== null) {
      query = query.lte("price", filters.maxPrice);
    }
    if (filters.bedrooms !== null) {
      query = query.gte("bedrooms", filters.bedrooms);
    }

    return query
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(60);
  });
}

export async function getFeaturedListings(limit = 3): Promise<PublicListing[]> {
  const featured = await loadListings((client) =>
    client
      .from("listings")
      .select(PUBLIC_LISTING_FIELDS)
      .eq("is_published", true)
      .eq("status", "active")
      .eq("is_featured", true)
      .order("created_at", { ascending: false })
      .limit(limit),
  );

  if (featured.length > 0) {
    return featured;
  }

  return loadListings((client) =>
    client
      .from("listings")
      .select(PUBLIC_LISTING_FIELDS)
      .eq("is_published", true)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(limit),
  );
}

export async function getPublishedListingBySlug(
  slug: string,
): Promise<PublicListing | null> {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return null;
  }

  try {
    const client = createPublicListingClient();
    const { data, error } = await client
      .from("listings")
      .select(PUBLIC_LISTING_FIELDS)
      .eq("slug", slug)
      .eq("is_published", true)
      .eq("status", "active")
      .maybeSingle();

    if (error || !data) {
      return null;
    }
    return publicListingRowSchema.parse(data);
  } catch {
    return null;
  }
}

export async function getPublishedListingBySlugForSubmission(
  slug: string,
): Promise<PublicListing | null> {
  return getPublishedListingBySlug(slug);
}

export async function getListingImages(
  listingId: string,
  propertyId?: string | null,
): Promise<ListingImage[]> {
  if (!z.uuid().safeParse(listingId).success) {
    return [];
  }

  try {
    const client = createPublicListingClient();
    const relationships = [
      `and(entity_type.eq.listing,entity_id.eq.${listingId})`,
    ];
    if (propertyId && z.uuid().safeParse(propertyId).success) {
      relationships.push(
        `and(entity_type.eq.property,entity_id.eq.${propertyId})`,
      );
    }

    const { data, error } = await client
      .from("attachments")
      .select("id, path, caption, is_primary, sort_order")
      .eq("visibility", "public")
      .eq("bucket", PUBLIC_STORAGE_BUCKET)
      .or(relationships.join(","))
      .order("is_primary", { ascending: false })
      .order("sort_order", { ascending: true });

    if (error || !data) {
      return [];
    }

    // The signed-URL route rechecks approval and mints a short-lived URL on
    // every image request, so public pages never rely on a permanent object URL.
    return z.array(listingImageRowSchema).parse(data).map((image) => ({
      ...image,
      url: `/api/public-images/${image.id}`,
    }));
  } catch {
    return [];
  }
}

export async function getPublishedListingOptions(): Promise<
  PublishedListingOption[]
> {
  try {
    const client = createPublicListingClient();
    const { data, error } = await client
      .from("listings")
      .select("slug, title, listing_type, town, county")
      .eq("is_published", true)
      .eq("status", "active")
      .order("title", { ascending: true })
      .limit(200);

    if (error || !data) {
      return [];
    }
    return z.array(listingOptionSchema).parse(data);
  } catch {
    return [];
  }
}

/**
 * Minimal projection for /sitemap.xml. RLS plus the explicit filters allow only
 * published, active listings, and no private listing fields are selected.
 * Pagination avoids PostgREST's default row cap so all eligible URLs appear.
 */
export async function getSitemapListings(): Promise<SitemapListing[]> {
  try {
    const client = createPublicListingClient();
    const listings: SitemapListing[] = [];

    for (
      let start = 0;
      start < SITEMAP_MAX_URLS;
      start += SITEMAP_PAGE_SIZE
    ) {
      const end = Math.min(
        start + SITEMAP_PAGE_SIZE - 1,
        SITEMAP_MAX_URLS - 1,
      );
      const { data, error } = await client
        .from("listings")
        .select("slug, updated_at, created_at")
        .eq("is_published", true)
        .eq("status", "active")
        .order("updated_at", { ascending: false })
        .range(start, end);

      if (error || !data) {
        return [];
      }

      listings.push(...z.array(sitemapListingSchema).parse(data));

      if (data.length < end - start + 1) {
        break;
      }
    }

    return listings;
  } catch {
    return [];
  }
}
