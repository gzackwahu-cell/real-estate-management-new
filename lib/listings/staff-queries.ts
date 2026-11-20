import "server-only";

import { z } from "zod";
import type { PortfolioClient } from "@/lib/portfolio/queries";

const dbNumber = z.preprocess(
  (value) => (typeof value === "string" && value.trim() !== "" ? Number(value) : value),
  z.number().refine(Number.isFinite, "Invalid stored number."),
);

const nullableDbNumber = z.preprocess(
  (value) =>
    value === null || value === undefined || value === "" ? null : Number(value),
  z.number().refine(Number.isFinite, "Invalid stored number.").nullable(),
);

const staffListingSchema = z.object({
  id: z.uuid(),
  slug: z.string(),
  listing_type: z.string(),
  property_category: z.string(),
  status: z.string(),
  is_published: z.boolean(),
  is_featured: z.boolean(),
  managed_by_agency: z.boolean(),
  property_id: z.uuid().nullable(),
  unit_id: z.uuid().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  county: z.string(),
  town: z.string(),
  estate: z.string().nullable(),
  physical_address: z.string().nullable(),
  bedrooms: nullableDbNumber,
  bathrooms: nullableDbNumber,
  price: dbNumber,
  price_period: z.string(),
  features: z.array(z.string()).default([]),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

const embeddedListingSchema = z.object({
  title: z.string(),
  slug: z.string(),
});

const embeddedListing = z
  .union([embeddedListingSchema, z.array(embeddedListingSchema)])
  .nullish()
  .transform((value) => (Array.isArray(value) ? value[0] ?? null : value ?? null));

const enquirySchema = z.object({
  id: z.uuid(),
  listing_id: z.uuid(),
  full_name: z.string(),
  phone: z.string(),
  email: z.string(),
  preferred_date: z.string().nullable(),
  message: z.string(),
  status: z.string(),
  follow_up_notes: z.string(),
  source: z.string(),
  created_at: z.string().optional(),
  listings: embeddedListing,
});

const viewingSchema = z.object({
  id: z.uuid(),
  listing_id: z.uuid(),
  full_name: z.string(),
  phone: z.string(),
  email: z.string(),
  preferred_date: z.string().nullable(),
  preferred_time: z.string().nullable(),
  message: z.string(),
  status: z.string(),
  follow_up_notes: z.string(),
  created_at: z.string().optional(),
  listings: embeddedListing,
});

const propertyOptionSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  town: z.string(),
  county: z.string(),
});

const unitOptionSchema = z.object({
  id: z.uuid(),
  property_id: z.uuid(),
  unit_number: z.string(),
  unit_type: z.string(),
  monthly_rent: dbNumber,
});

export type StaffListing = z.infer<typeof staffListingSchema>;
export type StaffEnquiry = z.infer<typeof enquirySchema>;
export type StaffViewing = z.infer<typeof viewingSchema>;
export type PropertyOption = z.infer<typeof propertyOptionSchema>;
export type UnitOption = z.infer<typeof unitOptionSchema>;

export async function listStaffListings(
  supabase: PortfolioClient,
): Promise<StaffListing[]> {
  const { data, error } = await supabase
    .from("listings")
    .select(
      "id, slug, listing_type, property_category, status, is_published, is_featured, managed_by_agency, property_id, unit_id, title, description, county, town, estate, physical_address, bedrooms, bathrooms, price, price_period, features, created_at, updated_at",
    )
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }
  return z.array(staffListingSchema).parse(data);
}

export async function getStaffListing(
  supabase: PortfolioClient,
  id: string,
): Promise<StaffListing | null> {
  const { data, error } = await supabase
    .from("listings")
    .select(
      "id, slug, listing_type, property_category, status, is_published, is_featured, managed_by_agency, property_id, unit_id, title, description, county, town, estate, physical_address, bedrooms, bathrooms, price, price_period, features, created_at, updated_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }
  return staffListingSchema.parse(data);
}

export async function listStaffEnquiries(
  supabase: PortfolioClient,
): Promise<StaffEnquiry[]> {
  const { data, error } = await supabase
    .from("sale_inquiries")
    .select(
      "id, listing_id, full_name, phone, email, preferred_date, message, status, follow_up_notes, source, created_at, listings(title, slug)",
    )
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }
  return z.array(enquirySchema).parse(data);
}

export async function getStaffEnquiry(
  supabase: PortfolioClient,
  id: string,
): Promise<StaffEnquiry | null> {
  const { data, error } = await supabase
    .from("sale_inquiries")
    .select(
      "id, listing_id, full_name, phone, email, preferred_date, message, status, follow_up_notes, source, created_at, listings(title, slug)",
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }
  return enquirySchema.parse(data);
}

export async function listStaffViewings(
  supabase: PortfolioClient,
): Promise<StaffViewing[]> {
  const { data, error } = await supabase
    .from("viewing_appointments")
    .select(
      "id, listing_id, full_name, phone, email, preferred_date, preferred_time, message, status, follow_up_notes, created_at, listings(title, slug)",
    )
    .order("preferred_date", { ascending: true })
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }
  return z.array(viewingSchema).parse(data);
}

export async function getStaffViewing(
  supabase: PortfolioClient,
  id: string,
): Promise<StaffViewing | null> {
  const { data, error } = await supabase
    .from("viewing_appointments")
    .select(
      "id, listing_id, full_name, phone, email, preferred_date, preferred_time, message, status, follow_up_notes, created_at, listings(title, slug)",
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }
  return viewingSchema.parse(data);
}

export async function getPropertyOptions(
  supabase: PortfolioClient,
): Promise<PropertyOption[]> {
  const { data, error } = await supabase
    .from("properties")
    .select("id, title, town, county")
    .eq("status", "active")
    .order("title", { ascending: true });

  if (error || !data) {
    return [];
  }
  return z.array(propertyOptionSchema).parse(data);
}

export async function getUnitOptions(
  supabase: PortfolioClient,
): Promise<UnitOption[]> {
  const { data, error } = await supabase
    .from("units")
    .select("id, property_id, unit_number, unit_type, monthly_rent")
    .eq("is_active", true)
    .order("unit_number", { ascending: true });

  if (error || !data) {
    return [];
  }
  return z.array(unitOptionSchema).parse(data);
}
