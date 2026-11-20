import { z } from "zod";

export type TenancyFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: string;
};

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.");

const nullableDateSchema = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? null : value),
  dateSchema.nullable(),
);

const nullableUuidSchema = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? null : value),
  z.uuid("Select a valid record.").nullable(),
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

const phoneSchema = z
  .string()
  .trim()
  .min(7, "Enter a valid phone number.")
  .max(30, "Phone number is too long.")
  .regex(/^[+()\d\s-]+$/, "Use digits, spaces, +, - or brackets only.");

const moneySchema = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? 0 : Number(value)),
  z
    .number("Enter a valid amount.")
    .refine(Number.isFinite, "Enter a valid amount.")
    .min(0, "Amount cannot be negative.")
    .max(999_999_999.99, "Amount is too large."),
);

const checkboxSchema = z.preprocess(
  (value) =>
    value === "on" || value === "true" || value === "1" || value === true,
  z.boolean(),
);

const optionalText = (max: number, message: string) =>
  z.string().trim().max(max, message);

// ---------------------------------------------------------------------------
// Form input validation
// ---------------------------------------------------------------------------

export const tenantInputSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "Enter the tenant's full name.")
      .max(120, "Full name is too long."),
    phone: phoneSchema,
    email: emailSchema,
    idReference: z
      .string()
      .trim()
      .min(3, "Enter an ID or reference number.")
      .max(64, "ID or reference number is too long."),
    address: z
      .string()
      .trim()
      .min(5, "Enter the tenant's address.")
      .max(240, "Address is too long."),
    emergencyContactName: optionalText(120, "Emergency contact name is too long."),
    emergencyContactPhone: optionalText(30, "Emergency contact phone is too long."),
    status: z.enum(["active", "inactive", "blacklisted", "archived"]),
  })
  .superRefine((value, context) => {
    const hasName = value.emergencyContactName.length > 0;
    const hasPhone = value.emergencyContactPhone.length > 0;

    if (hasName && !hasPhone) {
      context.addIssue({
        code: "custom",
        path: ["emergencyContactPhone"],
        message: "Add an emergency contact phone number.",
      });
    }
    if (hasPhone && !hasName) {
      context.addIssue({
        code: "custom",
        path: ["emergencyContactName"],
        message: "Add an emergency contact name.",
      });
    }
  });

export const applicationInputSchema = z.object({
  unitId: z.uuid("Select a valid unit."),
  applicantFullName: z
    .string()
    .trim()
    .min(2, "Enter the applicant's full name.")
    .max(120, "Full name is too long."),
  applicantPhone: phoneSchema,
  applicantEmail: emailSchema,
  applicantIdReference: z
    .string()
    .trim()
    .min(3, "Enter an ID or reference number.")
    .max(64, "ID or reference number is too long."),
  applicantAddress: optionalText(240, "Address is too long."),
  proposedRent: moneySchema,
  applicationDate: dateSchema,
  notes: optionalText(1000, "Notes are too long."),
});

export const applicationReviewInputSchema = z
  .object({
    status: z.enum(["under_review", "approved", "rejected", "withdrawn"]),
    decisionNotes: optionalText(1000, "Decision notes are too long."),
  })
  .superRefine((value, context) => {
    if (
      (value.status === "approved" || value.status === "rejected") &&
      value.decisionNotes.length === 0
    ) {
      context.addIssue({
        code: "custom",
        path: ["decisionNotes"],
        message: "Add a decision note for this outcome.",
      });
    }
  });

export const leaseInputSchema = z
  .object({
    tenantId: z.uuid("Select a valid tenant."),
    unitId: z.uuid("Select a valid unit."),
    startDate: dateSchema,
    endDate: dateSchema,
    monthlyRent: moneySchema,
    securityDepositRequired: checkboxSchema,
    rentDueDay: z.preprocess(
      (value) => (value === "" || value === null || value === undefined ? NaN : Number(value)),
      z
        .number("Enter a valid rent due day.")
        .int("Rent due day must be a whole number.")
        .min(1, "Rent due day must be at least 1.")
        .max(28, "Rent due day cannot exceed 28."),
    ),
    status: z.enum(["draft", "pending", "active", "expired", "terminated"]),
    specialTerms: optionalText(2000, "Special terms are too long."),
    notes: optionalText(1000, "Notes are too long."),
    terminatedOn: nullableDateSchema,
    terminationReason: optionalText(1000, "Termination reason is too long."),
    sourceApplicationId: nullableUuidSchema,
    renewalOf: nullableUuidSchema,
  })
  .superRefine((value, context) => {
    if (value.endDate <= value.startDate) {
      context.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "The end date must be after the start date.",
      });
    }

    if (value.status === "terminated") {
      if (!value.terminatedOn) {
        context.addIssue({
          code: "custom",
          path: ["terminatedOn"],
          message: "Add the termination date.",
        });
      }
      if (value.terminationReason.length === 0) {
        context.addIssue({
          code: "custom",
          path: ["terminationReason"],
          message: "Add a termination reason.",
        });
      }
    } else if (value.terminatedOn || value.terminationReason.length > 0) {
      context.addIssue({
        code: "custom",
        path: ["status"],
        message: "Termination details require a terminated lease status.",
      });
    }

    if (value.sourceApplicationId && value.renewalOf) {
      context.addIssue({
        code: "custom",
        path: ["renewalOf"],
        message: "A lease cannot be both a renewal and an application conversion.",
      });
    }
  });

// ---------------------------------------------------------------------------
// Database row validation
// ---------------------------------------------------------------------------

const dbNumberSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() !== "" ? Number(value) : value),
  z.number().refine(Number.isFinite, "Invalid stored number."),
);

const embeddedPropertySchema = z.object({
  id: z.uuid(),
  title: z.string(),
  county: z.string().optional(),
  town: z.string().optional(),
});

const embeddedTenantSchema = z.object({
  id: z.uuid(),
  full_name: z.string(),
  phone: z.string().optional(),
  email: z.string().nullable().optional(),
  status: z.string(),
  id_reference: z.string().optional(),
});

const embeddedUnitSchema = z.object({
  id: z.uuid(),
  unit_number: z.string(),
  property_id: z.uuid(),
  monthly_rent: dbNumberSchema.optional(),
  occupancy_status: z.string().optional(),
  properties: z.union([embeddedPropertySchema, z.array(embeddedPropertySchema)]).nullish(),
});

const embeddedArrayOrObject = <T extends z.ZodTypeAny>(schema: T) =>
  z.union([schema, z.array(schema)]).nullish();

export const tenantListItemSchema = z.object({
  id: z.uuid(),
  full_name: z.string(),
  phone: z.string(),
  email: z.string().nullable(),
  status: z.string(),
  created_at: z.string().optional(),
});

export const tenantRowSchema = z.object({
  id: z.uuid(),
  profile_id: z.uuid().nullable().optional(),
  full_name: z.string(),
  phone: z.string(),
  email: z.string().nullable(),
  id_reference: z.string(),
  address: z.string(),
  emergency_contact_name: z.string().nullable(),
  emergency_contact_phone: z.string().nullable(),
  status: z.string(),
  created_at: z.string().optional(),
});

export const applicationRowSchema = z.object({
  id: z.uuid(),
  tenant_id: z.uuid().nullable(),
  unit_id: z.uuid(),
  applicant_full_name: z.string(),
  applicant_phone: z.string(),
  applicant_email: z.string().nullable(),
  applicant_id_reference: z.string(),
  applicant_address: z.string().nullable(),
  proposed_rent: dbNumberSchema,
  application_date: z.string(),
  notes: z.string().nullable(),
  status: z.string(),
  decision_notes: z.string().nullable(),
  decided_by: z.uuid().nullable().optional(),
  decided_at: z.string().nullable().optional(),
  created_at: z.string().optional(),
  units: embeddedArrayOrObject(embeddedUnitSchema),
  tenants: embeddedArrayOrObject(embeddedTenantSchema),
});

export const leaseRowSchema = z.object({
  id: z.uuid(),
  tenant_id: z.uuid(),
  unit_id: z.uuid(),
  source_application_id: z.uuid().nullable().optional(),
  start_date: z.string(),
  end_date: z.string(),
  monthly_rent: dbNumberSchema,
  security_deposit_required: z.boolean(),
  rent_due_day: z.number(),
  status: z.string(),
  special_terms: z.string().nullable(),
  notes: z.string().nullable(),
  renewal_of: z.uuid().nullable().optional(),
  terminated_on: z.string().nullable().optional(),
  termination_reason: z.string().nullable().optional(),
  created_at: z.string().optional(),
  tenants: embeddedArrayOrObject(embeddedTenantSchema),
  units: embeddedArrayOrObject(embeddedUnitSchema),
});

export type TenantListItem = z.infer<typeof tenantListItemSchema>;
export type TenantRecord = z.infer<typeof tenantRowSchema>;
export type EmbeddedProperty = z.infer<typeof embeddedPropertySchema>;
export type EmbeddedTenant = z.infer<typeof embeddedTenantSchema>;
export type EmbeddedUnitRow = z.infer<typeof embeddedUnitSchema>;
export type EmbeddedUnit = Omit<EmbeddedUnitRow, "properties"> & {
  properties: EmbeddedProperty | null;
};

export type ApplicationRow = z.infer<typeof applicationRowSchema>;
export type ApplicationRecord = Omit<
  ApplicationRow,
  "units" | "tenants"
> & {
  units: EmbeddedUnit | null;
  tenants: EmbeddedTenant | null;
};

export type LeaseRow = z.infer<typeof leaseRowSchema>;
export type LeaseRecord = Omit<LeaseRow, "tenants" | "units"> & {
  tenants: EmbeddedTenant | null;
  units: EmbeddedUnit | null;
};

export type TenantOption = Pick<
  TenantRecord,
  "id" | "full_name" | "phone" | "id_reference" | "status"
>;

export type UnitOption = {
  id: string;
  unit_number: string;
  property_title: string;
  monthly_rent: number;
  deposit_required: boolean;
  occupancy_status: string;
};

export function formStateFromZod(error: z.ZodError): TenancyFormState {
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
