export type SitemapEntry = {
  url: string;
  lastModified?: string;
  changeFrequency?: "weekly" | "monthly";
  priority?: number;
};

export type SitemapListing = {
  slug: string;
  updated_at?: string | null;
  created_at?: string | null;
};

export const STATIC_SITEMAP_ROUTES = [
  "/",
  "/about",
  "/properties",
  "/properties/rent",
  "/properties/sale",
  "/contact",
  "/enquire",
  "/viewings/request",
] as const;

const LISTING_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function normalizeSiteUrl(siteUrl: string): string {
  return siteUrl.replace(/\/+$/, "");
}

function normalizeDate(value: string | null | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    return undefined;
  }

  return new Date(timestamp).toISOString();
}

/**
 * Builds sitemap entries from static routes and the minimal public listing
 * projection supplied by the server-side query. Unknown fields are never
 * copied into the result.
 */
export function buildSitemapEntries(
  siteUrl: string,
  listings: readonly SitemapListing[],
): SitemapEntry[] {
  const baseUrl = normalizeSiteUrl(siteUrl);

  const entries: SitemapEntry[] = STATIC_SITEMAP_ROUTES.map((route) => ({
    url: `${baseUrl}${route}`,
    changeFrequency: route === "/" ? "weekly" : "monthly",
    priority: route === "/" ? 1 : 0.7,
  }));

  const seenSlugs = new Set<string>();

  for (const listing of listings) {
    const slug = listing.slug;

    if (
      typeof slug !== "string" ||
      !LISTING_SLUG_PATTERN.test(slug) ||
      seenSlugs.has(slug)
    ) {
      continue;
    }

    seenSlugs.add(slug);

    const lastModified =
      normalizeDate(listing.updated_at) ?? normalizeDate(listing.created_at);
    const entry: SitemapEntry = {
      url: `${baseUrl}/properties/${slug}`,
      changeFrequency: "weekly",
      priority: 0.8,
    };

    if (lastModified) {
      entry.lastModified = lastModified;
    }

    entries.push(entry);
  }

  return entries;
}
