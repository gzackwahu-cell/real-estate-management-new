import { z } from "zod";

export type PortfolioFormState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string>;
};

const checkboxSchema = z.preprocess(
  (value) =>
    value === "on" || value === "true" || value === "1" || value === true,
  z.boolean(),
);

const emailSchema = z
  .string()
  .trim()
  .max(254, "Email address is too long.")
  .refine(
    (value) => value === "" || z.email().safeParse(value).success,
    "Enter a valid email address.",
  )
  .transform((value) => value.toLowerCase());

const nullablePercentageSchema = z.preprocess(
  (value) =>
    value === "" || value === null || value === undefined ? null : Number(value),
  z
    .number("Enter a valid percentage.")
    .refine(Number.isFinite, "Enter a valid percentage.")
    .min(0, "Percentage cannot be negative.")
    .max(100, "Percentage cannot exceed 100.")
    .nullable(),
);

const moneySchema = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? 0 : Number(value)),
  z
    .number("Enter a valid amount.")
    .refine(Number.isFinite, "Enter a valid amount.")
    .min(0, "Amount cannot be negative.")
    .max(999_999_999.99, "Amount is too large."),
);

export const ownerInputSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Enter the owner's full name.")
    .max(120, "Full name is too long."),
  phone: z
    .string()
    .trim()
    .min(7, "Enter a valid phone number.")
    .max(30, "Phone number is too long.")
    .regex(/^[+()\d\s-]+$/, "Use digits, spaces, +, - or brackets only."),
  email: emailSchema,
  idReference: z
    .string()
    .trim()
    .min(3, "Enter an ID or reference number.")
    .max(64, "ID or reference number is too long."),
  address: z
    .string()
    .trim()
    .min(5, "Enter the owner's address.")
    .max(240, "Address is too long."),
  isActive: checkboxSchema,
});

export const ownerAssignmentSchema = z.object({
  ownerId: z.uuid("Select a valid owner."),
  percentage: nullablePercentageSchema,
  verificationStatus: z.enum(["pending", "verified", "rejected"]),
  isPrimary: z.boolean(),
});

export const propertyInputSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, "Enter a property title.")
      .max(160, "Title is too long."),
    description: z.string().trim().max(2000, "Description is too long."),
    propertyType: z.enum(["residential", "commercial", "land", "mixed_use"]),
    county: z.string().trim().min(2, "Enter a county.").max(80, "County is too long."),
    town: z.string().trim().min(2, "Enter a town.").max(80, "Town is too long."),
    estate: z.string().trim().max(120, "Estate is too long."),
    physicalAddress: z
      .string()
      .trim()
      .min(5, "Enter the physical address.")
      .max(240, "Physical address is too long."),
    directions: z.string().trim().max(1000, "Directions are too long."),
    status: z.enum(["draft", "active", "maintenance", "inactive"]),
    owners: z
      .array(ownerAssignmentSchema)
      .min(1, "Select at least one owner."),
  })
  .superRefine((value, context) => {
    const primaryCount = value.owners.filter((owner) => owner.isPrimary).length;
    if (primaryCount !== 1) {
      context.addIssue({
        code: "custom",
        path: ["owners"],
        message: "Choose exactly one primary owner.",
      });
    }

    value.owners.forEach((owner, index) => {
      if (owner.verificationStatus === "verified" && owner.percentage === null) {
        context.addIssue({
          code: "custom",
          path: ["owners", index, "percentage"],
          message: "Verified owners require a percentage.",
        });
      }
    });
  });

export const unitInputSchema = z.object({
  unitNumber: z
    .string()
    .trim()
    .min(1, "Enter a unit number or name.")
    .max(80, "Unit number is too long."),
  unitType: z.enum([
    "bedsitter",
    "studio",
    "one_bedroom",
    "two_bedroom",
    "three_bedroom",
    "apartment",
    "maisonette",
    "shop",
    "office",
    "custom",
  ]),
  monthlyRent: moneySchema,
  depositRequired: checkboxSchema,
  occupancyStatus: z.enum(["vacant", "occupied", "reserved", "maintenance"]),
  isActive: checkboxSchema,
  notes: z.string().trim().max(500, "Notes are too long."),
});

// ---------------------------------------------------------------------------
// Database row validation
// ---------------------------------------------------------------------------

const dbNumberSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() !== "" ? Number(value) : value),
  z.number().refine(Number.isFinite, "Invalid stored number."),
);

const dbNullableNumberSchema = z.preprocess(
  (value) =>
    value === null || value === undefined || value === ""
      ? null
      : Number(value),
  z.number().refine(Number.isFinite, "Invalid stored number.").nullable(),
);

export const ownerRowSchema = z.object({
  id: z.uuid(),
  full_name: z.string(),
  phone: z.string(),
  email: z.string().nullable(),
  id_reference: z.string(),
  address: z.string(),
  is_active: z.boolean(),
  created_at: z.string().optional(),
});

export const propertyRowSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  description: z.string().nullable(),
  property_type: z.string(),
  county: z.string(),
  town: z.string(),
  estate: z.string().nullable(),
  physical_address: z.string(),
  directions: z.string().nullable(),
  status: z.string(),
  created_at: z.string().optional(),
});

export const embeddedOwnerSchema = z.object({
  id: z.uuid(),
  full_name: z.string(),
  id_reference: z.string(),
});

export const embeddedPropertySchema = z.object({
  id: z.uuid(),
  title: z.string(),
  property_type: z.string(),
  county: z.string(),
  town: z.string(),
  status: z.string(),
});

export const propertyOwnerRowSchema = z.object({
  property_id: z.uuid(),
  owner_id: z.uuid(),
  ownership_percentage: dbNullableNumberSchema,
  verification_status: z.string(),
  is_primary: z.boolean(),
  owners: z.union([embeddedOwnerSchema, z.array(embeddedOwnerSchema)]).nullish(),
});

export const ownerPropertyRowSchema = z.object({
  property_id: z.uuid(),
  owner_id: z.uuid(),
  ownership_percentage: dbNullableNumberSchema,
  verification_status: z.string(),
  is_primary: z.boolean(),
  properties: z
    .union([embeddedPropertySchema, z.array(embeddedPropertySchema)])
    .nullish(),
});

export const unitRowSchema = z.object({
  id: z.uuid(),
  property_id: z.uuid(),
  unit_number: z.string(),
  unit_type: z.string(),
  monthly_rent: dbNumberSchema,
  deposit_required: z.boolean(),
  occupancy_status: z.string(),
  is_active: z.boolean(),
  notes: z.string().nullable(),
});

export const attachmentRowSchema = z.object({
  id: z.uuid(),
  entity_type: z.string(),
  entity_id: z.uuid(),
  bucket: z.string(),
  visibility: z.string(),
  path: z.string(),
  caption: z.string().nullable(),
  is_primary: z.boolean(),
  sort_order: z.number(),
});

export type OwnerRecord = z.infer<typeof ownerRowSchema>;
export type PropertyRecord = z.infer<typeof propertyRowSchema>;
export type EmbeddedOwner = z.infer<typeof embeddedOwnerSchema>;
export type EmbeddedProperty = z.infer<typeof embeddedPropertySchema>;
export type PropertyOwnerRecord = Omit<
  z.infer<typeof propertyOwnerRowSchema>,
  "owners"
> & { owners: EmbeddedOwner | null };
export type OwnerPropertyRecord = Omit<
  z.infer<typeof ownerPropertyRowSchema>,
  "properties"
> & { properties: EmbeddedProperty | null };
export type UnitRecord = z.infer<typeof unitRowSchema>;
export type AttachmentRecord = z.infer<typeof attachmentRowSchema>;
export type PropertyOwnerInput = z.infer<typeof ownerAssignmentSchema>;
export type OwnerOption = Pick<OwnerRecord, "id" | "full_name" | "id_reference" | "is_active">;

export function formStateFromZod(error: z.ZodError): PortfolioFormState {
  const fieldErrors: Record<string, string> = {};

  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".") || "form";
    fieldErrors[key] ??= issue.message;
  }

  return {
    error: "Please correct the highlighted fields.",
    fieldErrors,
  };
}

export function formText(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

/** Reads the dynamic owner rows rendered by the property form. */
export function readOwnerAssignments(formData: FormData): unknown[] {
  const ownerIds = formText(formData, "ownerIds")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const primaryOwnerId = formText(formData, "primaryOwner");

  return ownerIds
    .filter((ownerId) => formText(formData, `owner_${ownerId}_selected`) === "on")
    .map((ownerId) => ({
      ownerId,
      percentage: formText(formData, `owner_${ownerId}_percentage`),
      verificationStatus:
        formText(formData, `owner_${ownerId}_verification`) || "pending",
      isPrimary: primaryOwnerId === ownerId,
    }));
}

// ---------------------------------------------------------------------------
// Attachment uploads
// ---------------------------------------------------------------------------

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

const MANAGED_ATTACHMENT_ENTITY_TYPES = [
  "property",
  "unit",
  "lease",
  "listing",
] as const;

const PUBLIC_ATTACHMENT_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const PRIVATE_ATTACHMENT_MIME_TYPES = new Set([
  ...PUBLIC_ATTACHMENT_MIME_TYPES,
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]);

const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "text/plain": "txt",
};

export const attachmentUploadSchema = z.object({
  entityType: z.enum(MANAGED_ATTACHMENT_ENTITY_TYPES),
  entityId: z.uuid(),
  visibility: z.enum(["private", "public"]),
  caption: z.string().trim().max(240, "Caption is too long."),
  sortOrder: z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? 0 : Number(value)),
    z
      .number("Enter a valid sort order.")
      .int("Enter a whole-number sort order.")
      .min(0, "Sort order cannot be negative.")
      .max(10000, "Sort order is too large."),
  ),
  isPrimary: checkboxSchema,
});

export function attachmentUploadValues(formData: FormData) {
  return {
    caption: formText(formData, "caption"),
    visibility: formText(formData, "visibility"),
    sortOrder: formText(formData, "sortOrder"),
    isPrimary: formData.get("isPrimary"),
  };
}

export function isAttachmentMimeAllowed(
  mimeType: string,
  visibility: "private" | "public",
): boolean {
  return visibility === "public"
    ? PUBLIC_ATTACHMENT_MIME_TYPES.has(mimeType)
    : PRIVATE_ATTACHMENT_MIME_TYPES.has(mimeType);
}

export function attachmentExtensionForMime(mimeType: string): string | null {
  return MIME_EXTENSIONS[mimeType] ?? null;
}

export function isManagedAttachmentEntityType(
  value: string,
): value is (typeof MANAGED_ATTACHMENT_ENTITY_TYPES)[number] {
  return (MANAGED_ATTACHMENT_ENTITY_TYPES as readonly string[]).includes(value);
}

export type ManagedAttachmentEntityType =
  (typeof MANAGED_ATTACHMENT_ENTITY_TYPES)[number];
