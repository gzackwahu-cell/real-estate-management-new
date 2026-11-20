import { z } from "zod";

export type MaintenanceFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: string;
};

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.")
  .refine(
    (value) => !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime()),
    "Enter a valid date.",
  );

const optionalText = (max: number, message: string) =>
  z.string().trim().max(max, message).optional().default("");

const optionalUuidSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z.uuid("Select a valid record.").nullable(),
);

const numberSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() !== "" ? Number(value) : value),
  z.number("Enter a valid number.").refine(Number.isFinite, "Enter a valid number."),
);

const positiveMoneySchema = numberSchema
  .refine((value) => value > 0, "Amount must be greater than zero.")
  .refine((value) => value <= 999_999_999.99, "Amount is too large.");

// ---------------------------------------------------------------------------
// Form input validation
// ---------------------------------------------------------------------------

export const createMaintenanceRequestInputSchema = z.object({
  propertyId: z.uuid("Select a property."),
  unitId: optionalUuidSchema,
  tenantId: optionalUuidSchema,
  title: z
    .string()
    .trim()
    .min(5, "Enter a short title (at least 5 characters).")
    .max(160, "Title is too long."),
  description: z
    .string()
    .trim()
    .min(10, "Describe the issue (at least 10 characters).")
    .max(4000, "Description is too long."),
  category: z.enum([
    "plumbing",
    "electrical",
    "structural",
    "cleaning",
    "security",
    "appliances",
    "painting",
    "other",
  ]),
  priority: z.enum(["low", "normal", "high", "emergency"]),
  reportedDate: dateSchema,
  tenantContact: optionalText(160, "Contact detail is too long."),
  notes: optionalText(1000, "Notes are too long."),
  portal: z.enum(["tenant", "staff"]).optional().default("staff"),
});

export const assignMaintenanceInputSchema = z.object({
  assignedTo: optionalUuidSchema,
  note: optionalText(1000, "Note is too long."),
});

export const updateMaintenanceStatusInputSchema = z.object({
  status: z.enum([
    "submitted",
    "acknowledged",
    "assigned",
    "in_progress",
    "awaiting_parts",
    "completed",
    "cancelled",
  ]),
  note: optionalText(1000, "Note is too long."),
  resolution: optionalText(2000, "Resolution is too long."),
});

export const addMaintenanceNoteInputSchema = z.object({
  note: z
    .string()
    .trim()
    .min(3, "Enter a work note (at least 3 characters).")
    .max(1000, "Note is too long."),
});

export const maintenanceExpenseInputSchema = z.object({
  propertyId: z.uuid("Select a property."),
  maintenanceRequestId: optionalUuidSchema,
  category: z.enum(["materials", "labour", "other"]),
  vendor: optionalText(160, "Supplier or vendor is too long."),
  description: z
    .string()
    .trim()
    .min(3, "Enter a description (at least 3 characters).")
    .max(2000, "Description is too long."),
  amount: positiveMoneySchema,
  paymentStatus: z.enum(["unpaid", "partial", "paid"]),
  expenseDate: dateSchema,
  reference: optionalText(120, "Reference is too long."),
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
});

const embeddedUnitSchema = z.object({
  id: z.uuid(),
  unit_number: z.string(),
  property_id: z.uuid().optional(),
});

const embeddedTenantSchema = z.object({
  id: z.uuid(),
  full_name: z.string(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
});

const embeddedArrayOrObject = <T extends z.ZodTypeAny>(schema: T) =>
  z.union([schema, z.array(schema)]).nullish();

export const maintenanceRequestRowSchema = z.object({
  id: z.uuid(),
  property_id: z.uuid(),
  unit_id: z.uuid().nullable().optional(),
  tenant_id: z.uuid().nullable().optional(),
  reported_by_profile: z.uuid().nullable().optional(),
  title: z.string(),
  description: z.string(),
  category: z.string(),
  priority: z.string(),
  status: z.string(),
  reported_date: z.string(),
  tenant_contact: z.string().nullable().optional(),
  assigned_to: z.uuid().nullable().optional(),
  assigned_at: z.string().nullable().optional(),
  completed_at: z.string().nullable().optional(),
  resolution: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  created_by: z.uuid().nullable().optional(),
  updated_by: z.uuid().nullable().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  properties: embeddedArrayOrObject(embeddedPropertySchema),
  units: embeddedArrayOrObject(embeddedUnitSchema),
  tenants: embeddedArrayOrObject(embeddedTenantSchema),
});

export const maintenanceAssignmentRowSchema = z.object({
  id: z.uuid(),
  request_id: z.uuid(),
  assigned_to: z.uuid().nullable().optional(),
  assigned_by: z.uuid().nullable().optional(),
  action: z.string(),
  note: z.string().nullable().optional(),
  created_at: z.string().optional(),
});

export const maintenanceProgressRowSchema = z.object({
  id: z.uuid(),
  request_id: z.uuid(),
  note: z.string(),
  status_from: z.string().nullable().optional(),
  status_to: z.string().nullable().optional(),
  updated_by: z.uuid().nullable().optional(),
  created_at: z.string().optional(),
});

export const expenseRowSchema = z.object({
  id: z.uuid(),
  property_id: z.uuid(),
  maintenance_request_id: z.uuid().nullable().optional(),
  category: z.string(),
  vendor: z.string().nullable().optional(),
  description: z.string(),
  amount: dbNumberSchema,
  payment_status: z.string(),
  expense_date: z.string(),
  reference: z.string().nullable().optional(),
  created_by: z.uuid().nullable().optional(),
  updated_by: z.uuid().nullable().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  properties: embeddedArrayOrObject(embeddedPropertySchema),
  maintenance_requests: embeddedArrayOrObject(
    z.object({ id: z.uuid(), title: z.string() }),
  ),
});

export const staffRowSchema = z.object({
  id: z.uuid(),
  full_name: z.string(),
  email: z.string().nullable(),
});

export const notificationRowSchema = z.object({
  id: z.uuid(),
  event_type: z.string(),
  title: z.string(),
  message: z.string(),
  entity_type: z.string().nullable().optional(),
  entity_id: z.uuid().nullable().optional(),
  link: z.string().nullable().optional(),
  created_at: z.string().optional(),
  status: z.string(),
});

// ---------------------------------------------------------------------------
// Normalized row types used by queries and UI
// ---------------------------------------------------------------------------

export type MaintenanceProperty = z.infer<typeof embeddedPropertySchema>;
export type MaintenanceUnit = z.infer<typeof embeddedUnitSchema>;
export type MaintenanceTenant = z.infer<typeof embeddedTenantSchema>;
export type MaintenanceStaff = z.infer<typeof staffRowSchema>;

export type MaintenanceRequestRow = z.infer<typeof maintenanceRequestRowSchema>;
export type MaintenanceRecord = Omit<
  MaintenanceRequestRow,
  "properties" | "units" | "tenants"
> & {
  properties: MaintenanceProperty | null;
  units: (MaintenanceUnit & { property_id: string }) | null;
  tenants: MaintenanceTenant | null;
};

export type MaintenanceAssignmentRecord = z.infer<typeof maintenanceAssignmentRowSchema>;
export type MaintenanceProgressRecord = z.infer<typeof maintenanceProgressRowSchema>;

export type ExpenseRow = z.infer<typeof expenseRowSchema>;
export type ExpenseRecord = Omit<ExpenseRow, "properties" | "maintenance_requests"> & {
  properties: MaintenanceProperty | null;
  maintenance_requests: { id: string; title: string } | null;
};

export type MaintenanceNotification = z.infer<typeof notificationRowSchema>;

export function firstEmbedded<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
}

export function formStateFromZod(error: z.ZodError): MaintenanceFormState {
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

export function formText(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}
