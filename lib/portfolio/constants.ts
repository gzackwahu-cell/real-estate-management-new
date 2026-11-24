export const PROPERTY_TYPES = [
  { value: "residential", label: "Residential" },
  { value: "commercial", label: "Commercial" },
  { value: "land", label: "Land" },
  { value: "mixed_use", label: "Mixed use" },
] as const;

export const PROPERTY_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "maintenance", label: "Maintenance" },
  { value: "inactive", label: "Inactive" },
] as const;

export const UNIT_TYPES = [
  { value: "bedsitter", label: "Bedsitter" },
  { value: "studio", label: "Studio" },
  { value: "one_bedroom", label: "One bedroom" },
  { value: "two_bedroom", label: "Two bedroom" },
  { value: "three_bedroom", label: "Three bedroom" },
  { value: "four_bedroom", label: "Four bedroom" },
  { value: "penthouse", label: "Penthouse" },
  { value: "apartment", label: "Apartment" },
  { value: "maisonette", label: "Maisonette" },
  { value: "house", label: "House" },
  { value: "shop", label: "Shop" },
  { value: "office", label: "Office" },
  { value: "warehouse", label: "Warehouse" },
  { value: "commercial_suite", label: "Commercial suite" },
  { value: "showroom", label: "Showroom" },
  { value: "retail", label: "Retail" },
  { value: "mixed_use", label: "Mixed use" },
  { value: "land", label: "Land" },
  { value: "custom", label: "Custom" },
  { value: "other", label: "Other" },
] as const;

export const RENT_PERIODS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
] as const;

export const OCCUPANCY_STATUSES = [
  { value: "vacant", label: "Vacant" },
  { value: "occupied", label: "Occupied" },
  { value: "reserved", label: "Reserved" },
  { value: "maintenance", label: "Maintenance" },
] as const;

export const VERIFICATION_STATUSES = [
  { value: "pending", label: "Pending verification" },
  { value: "verified", label: "Verified" },
  { value: "rejected", label: "Rejected" },
] as const;

export const ATTACHMENT_BUCKETS = {
  privateDocuments: "private-documents",
  propertyPrivate: "property-private",
  publicMarketing: "public-marketing",
} as const;

export const ATTACHMENT_ENTITY_TYPES = [
  "property",
  "unit",
  "owner",
  "listing",
  "maintenance_request",
  "lease",
  "expense",
] as const;

export const ATTACHMENT_VISIBILITIES = ["private", "public"] as const;

export function labelFor<T extends string>(
  options: readonly { value: T; label: string }[],
  value: string,
): string {
  return options.find((option) => option.value === value)?.label ?? value;
}
