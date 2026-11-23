import { resolveSiteUrl } from "@/lib/site-url";
import { formatMoney } from "@/lib/tenancy/constants";

const isDeployedSite = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);

export const SITE_URL = resolveSiteUrl(process.env.NEXT_PUBLIC_SITE_URL, {
  isDeployed: isDeployedSite,
});

export const SITE_METADATA_BASE = new URL(SITE_URL);

export const PUBLIC_STORAGE_BUCKET = "public-marketing";

export const LISTING_TYPES = [
  { value: "rent", label: "For rent" },
  { value: "sale", label: "For sale" },
  { value: "lease", label: "For lease" },
] as const;

export const PROPERTY_CATEGORIES = [
  { value: "house", label: "House" },
  { value: "apartment", label: "Apartment" },
  { value: "building", label: "Building" },
  { value: "land", label: "Land" },
  { value: "shop", label: "Shop" },
  { value: "office", label: "Office" },
  { value: "warehouse", label: "Warehouse" },
  { value: "commercial", label: "Commercial" },
  { value: "other", label: "Other" },
] as const;

export const LISTING_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "let", label: "Let" },
  { value: "sold", label: "Sold" },
  { value: "archived", label: "Archived" },
] as const;

export const PRICE_PERIODS = [
  { value: "monthly", label: "Per month" },
  { value: "yearly", label: "Per year" },
  { value: "total", label: "Total price" },
] as const;

export const INQUIRY_STATUSES = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "in_progress", label: "In progress" },
  { value: "closed", label: "Closed" },
  { value: "spam", label: "Spam" },
] as const;

export const VIEWING_STATUSES = [
  { value: "requested", label: "Requested" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
] as const;

export const PREFERRED_TIMES = [
  "09:00 - 11:00",
  "11:00 - 13:00",
  "14:00 - 16:00",
  "16:00 - 18:00",
] as const;

export type ListingType = (typeof LISTING_TYPES)[number]["value"];

export function labelFor<T extends string>(
  options: readonly { value: T; label: string }[],
  value: string,
): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

export function formatListingPrice(
  price: number,
  period: string,
  listingType: string,
): string {
  const amount = formatMoney(price);
  if (period === "total") {
    return amount;
  }
  if (period === "yearly") {
    return `${amount} / year`;
  }
  if (listingType === "rent") {
    return `${amount} / month`;
  }
  return amount;
}

export function listingLocation(location: {
  estate: string | null;
  town: string;
  county: string;
}): string {
  return [location.estate, location.town, location.county]
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(", ");
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}
