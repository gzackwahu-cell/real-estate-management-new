import { z } from "zod";
import type { ListingType } from "./constants";

export type PublicFormState = {
  status: "idle" | "success" | "error";
  error?: string;
  fieldErrors?: Record<string, string>;
  successMessage?: string;
};

export type StaffFormState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string>;
};

export const initialPublicFormState: PublicFormState = { status: "idle" };

const formText = (formData: FormData, name: string): string => {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
};

const dbNumber = z.preprocess(
  (value) => (typeof value === "string" && value.trim() !== "" ? Number(value) : value),
  z.number().refine(Number.isFinite, "Invalid stored number."),
);

const nullableDbNumber = z.preprocess(
  (value) =>
    value === null || value === undefined || value === ""
      ? null
      : Number(value),
  z.number().refine(Number.isFinite, "Invalid stored number.").nullable(),
);

export const publicListingRowSchema = z.object({
  id: z.uuid(),
  slug: z.string(),
  listing_type: z.enum(["rent", "sale"]),
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

export const listingImageRowSchema = z.object({
  id: z.uuid(),
  path: z.string(),
  caption: z.string().nullable(),
  is_primary: z.boolean(),
  sort_order: z.number(),
});

export type PublicListing = z.infer<typeof publicListingRowSchema>;
export type ListingImage = z.infer<typeof listingImageRowSchema> & {
  url: string;
};

const singleValue = (value: unknown): unknown =>
  Array.isArray(value) ? value[0] : value;

const optionalText = z.preprocess((value) => {
  const single = singleValue(value);
  return typeof single === "string" && single.trim() ? single.trim() : null;
}, z.string().nullable());

const optionalNumber = z.preprocess((value) => {
  const single = singleValue(value);
  if (single === null || single === undefined || single === "") {
    return null;
  }
  const number = Number(single);
  return Number.isFinite(number) ? number : null;
}, z.number().nullable());

export const listingFiltersSchema = z.object({
  category: z.preprocess(singleValue, z.enum(["rent", "sale"])),
  county: optionalText,
  location: optionalText,
  propertyType: optionalText,
  minPrice: optionalNumber,
  maxPrice: optionalNumber,
  bedrooms: optionalNumber,
});

export type ListingFilters = z.infer<typeof listingFiltersSchema>;

export type PublicSearchParams = Record<string, string | string[] | undefined>;

export function parseListingFilters(
  category: ListingType,
  params: PublicSearchParams,
): ListingFilters {
  const parsed = listingFiltersSchema.safeParse({ ...params, category });
  if (!parsed.success) {
    return {
      category,
      county: null,
      location: null,
      propertyType: null,
      minPrice: null,
      maxPrice: null,
      bedrooms: null,
    };
  }

  const filters = parsed.data;
  if (
    filters.minPrice !== null &&
    filters.maxPrice !== null &&
    filters.minPrice > filters.maxPrice
  ) {
    return { ...filters, minPrice: filters.maxPrice, maxPrice: filters.minPrice };
  }
  return filters;
}

const nameSchema = z
  .string()
  .trim()
  .min(2, "Enter your full name.")
  .max(120, "Name is too long.");

const phoneSchema = z
  .string()
  .trim()
  .min(7, "Enter a valid phone number.")
  .max(30, "Phone number is too long.")
  .regex(/^[+()\d\s-]+$/, "Use digits, spaces, +, - or brackets only.");

const emailSchema = z
  .email("Enter a valid email address.")
  .max(254, "Email address is too long.")
  .transform((value) => value.toLowerCase());

const dateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Select a valid date.")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
  }, "Select a valid date.")
  .refine(
    (value) => value >= new Date().toISOString().slice(0, 10),
    "Choose today or a future date.",
  );

const messageSchema = z
  .string()
  .trim()
  .min(10, "Enter a message of at least 10 characters.")
  .max(2000, "Message is too long.");

const honeypotSchema = z.string().max(0, "Invalid form submission.");

export const enquiryInputSchema = z.object({
  listingSlug: z
    .string()
    .trim()
    .min(1, "Select a property.")
    .max(120, "Select a valid property."),
  fullName: nameSchema,
  phone: phoneSchema,
  email: emailSchema,
  preferredDate: dateSchema,
  message: messageSchema,
  website: honeypotSchema,
});

export const viewingInputSchema = enquiryInputSchema.extend({
  preferredTime: z
    .string()
    .trim()
    .max(40, "Select a valid time.")
    .default(""),
});

export function enquiryFormValues(formData: FormData) {
  return {
    listingSlug: formText(formData, "listingSlug"),
    fullName: formText(formData, "fullName"),
    phone: formText(formData, "phone"),
    email: formText(formData, "email"),
    preferredDate: formText(formData, "preferredDate"),
    message: formText(formData, "message"),
    website: formText(formData, "website"),
  };
}

export function viewingFormValues(formData: FormData) {
  return {
    ...enquiryFormValues(formData),
    preferredTime: formText(formData, "preferredTime"),
  };
}

export function formStateFromZod(error: z.ZodError): PublicFormState {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".") || "form";
    fieldErrors[key] ??= issue.message;
  }
  return {
    status: "error",
    error: "Please correct the highlighted fields.",
    fieldErrors,
  };
}

// ---------------------------------------------------------------------------
// Staff listing and follow-up forms
// ---------------------------------------------------------------------------

const staffMoneySchema = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? 0 : Number(value)),
  z
    .number("Enter a valid price.")
    .refine(Number.isFinite, "Enter a valid price.")
    .min(0, "Price cannot be negative.")
    .max(999_999_999.99, "Price is too large."),
);

const staffOptionalInteger = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? null : Number(value)),
  z
    .number()
    .int("Enter a whole number.")
    .min(0, "Cannot be negative.")
    .max(50, "Value is too large.")
    .nullable(),
);

const checkboxSchema = z.preprocess(
  (value) => value === "on" || value === "true" || value === "1" || value === true,
  z.boolean(),
);

const optionalUuid = z.preprocess(
  (value) => (typeof value === "string" && value.trim() ? value.trim() : null),
  z.uuid("Select a valid record.").nullable(),
);

const listingInputBaseSchema = z.object({
  title: z.string().trim().min(3, "Enter a listing title.").max(160, "Title is too long."),
  slug: z.string().trim().max(120, "Slug is too long."),
  listingType: z.enum(["rent", "sale"]),
  propertyCategory: z.enum([
    "house",
    "apartment",
    "building",
    "land",
    "shop",
    "office",
    "warehouse",
    "commercial",
    "other",
  ]),
  status: z.enum(["draft", "active", "paused", "let", "sold", "archived"]),
  isPublished: checkboxSchema,
  isFeatured: checkboxSchema,
  managedByAgency: checkboxSchema,
  propertyId: optionalUuid,
  unitId: optionalUuid,
  description: z.string().trim().max(4000, "Description is too long."),
  county: z.string().trim().min(2, "Enter a county.").max(80, "County is too long."),
  town: z.string().trim().min(2, "Enter a town.").max(80, "Town is too long."),
  estate: z.string().trim().max(120, "Estate is too long."),
  physicalAddress: z.string().trim().max(240, "Address is too long."),
  bedrooms: staffOptionalInteger,
  bathrooms: staffOptionalInteger,
  price: staffMoneySchema,
  pricePeriod: z.enum(["monthly", "yearly", "total"]),
  features: z.string().trim().max(2000, "Features list is too long."),
});

export const listingInputSchema = listingInputBaseSchema.superRefine(
  (value, context) => {
    if (value.managedByAgency && !value.propertyId) {
      context.addIssue({
        code: "custom",
        path: ["propertyId"],
        message: "Select the managed property for this listing.",
      });
    }
    if (!value.managedByAgency && (value.propertyId || value.unitId)) {
      context.addIssue({
        code: "custom",
        path: ["managedByAgency"],
        message: "Marketed-only listings cannot link a property or unit.",
      });
    }
    if (value.unitId && !value.propertyId) {
      context.addIssue({
        code: "custom",
        path: ["unitId"],
        message: "Select a property before choosing a unit.",
      });
    }
  },
);

export const enquiryUpdateSchema = z.object({
  status: z.enum(["new", "contacted", "in_progress", "closed", "spam"]),
  followUpNotes: z.string().trim().max(4000, "Notes are too long."),
});

export const viewingUpdateSchema = z.object({
  status: z.enum(["requested", "confirmed", "completed", "cancelled"]),
  followUpNotes: z.string().trim().max(4000, "Notes are too long."),
});

export function listingFormValues(formData: FormData) {
  return {
    title: formText(formData, "title"),
    slug: formText(formData, "slug"),
    listingType: formText(formData, "listingType"),
    propertyCategory: formText(formData, "propertyCategory"),
    status: formText(formData, "status"),
    isPublished: formText(formData, "isPublished"),
    isFeatured: formText(formData, "isFeatured"),
    managedByAgency: formText(formData, "managedByAgency"),
    propertyId: formText(formData, "propertyId"),
    unitId: formText(formData, "unitId"),
    description: formText(formData, "description"),
    county: formText(formData, "county"),
    town: formText(formData, "town"),
    estate: formText(formData, "estate"),
    physicalAddress: formText(formData, "physicalAddress"),
    bedrooms: formText(formData, "bedrooms"),
    bathrooms: formText(formData, "bathrooms"),
    price: formText(formData, "price"),
    pricePeriod: formText(formData, "pricePeriod"),
    features: formText(formData, "features"),
  };
}

export function followUpFormValues(formData: FormData, statusField: string) {
  return {
    status: formText(formData, statusField),
    followUpNotes: formText(formData, "followUpNotes"),
  };
}

export function parseFeatures(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(/[\n,]+/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ).slice(0, 30);
}
