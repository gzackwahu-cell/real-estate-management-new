import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { SITE_URL } from "@/lib/listings/constants";
import { getSitemapListings } from "@/lib/listings/queries";
import { buildSitemapEntries } from "@/lib/listings/sitemap-core";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Cache Components keeps metadata handlers static by default. Opt out before
  // any database access so published listings are read at request time, not
  // baked into the build. Do not move this below the query or into a try/catch.
  await connection();

  const listings = await getSitemapListings();
  return buildSitemapEntries(SITE_URL, listings);
}
