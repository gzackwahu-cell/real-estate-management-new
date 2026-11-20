import { z } from "zod";

export type FinanceFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: string;
};

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.");

const periodSchema = z
  .string()
  .regex(/^\d{4}-\d{2}$/, "Select a valid month.");

const reasonSchema = z
  .string()
  .trim()
  .min(3, "Enter a reason (at least 3 characters).")
  .max(1000, "Reason is too long.");

const referenceSchema = z
  .string()
  .trim()
  .max(120, "Reference number is too long.");

const optionalText = (max: number, message: string) =>
  z.string().trim().max(max, message);

const numberSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() !== "" ? Number(value) : value),
  z.number("Enter a valid number.").refine(Number.isFinite, "Enter a valid number."),
);

const positiveMoneySchema = numberSchema
  .refine((value) => value > 0, "Amount must be greater than zero.")
  .refine((value) => value <= 999_999_999.99, "Amount is too large.");

const moneySchema = numberSchema
  .refine((value) => value >= 0, "Amount cannot be negative.")
  .refine((value) => value <= 999_999_999.99, "Amount is too large.");

const signedMoneySchema = numberSchema.refine(
  (value) => value !== 0 && Math.abs(value) <= 999_999_999.99,
  "Enter a non-zero amount within the allowed range.",
);

const checkboxSchema = z.preprocess(
  (value) => value === "on" || value === "true" || value === "1" || value === true,
  z.boolean(),
);

// ---------------------------------------------------------------------------
// Form input validation
// ---------------------------------------------------------------------------

export const generateChargesInputSchema = z.object({
  periodMonth: periodSchema,
});

export const adjustChargeInputSchema = z.object({
  amountDelta: signedMoneySchema,
  reason: reasonSchema,
});

export const recordPaymentInputSchema = z.object({
  tenantId: z.uuid("Select a tenant."),
  leaseId: z.uuid("Select a lease."),
  paymentType: z.enum(["rent", "deposit"]),
  paymentMethodId: z.uuid("Select a payment method."),
  amount: positiveMoneySchema,
  paymentDate: dateSchema,
  transactionReference: referenceSchema,
  notes: optionalText(1000, "Notes are too long."),
  allocateRent: checkboxSchema,
});

export const allocationItemSchema = z.object({
  chargeId: z.uuid("Select a valid charge."),
  amount: positiveMoneySchema,
});

export const allocationBatchSchema = z
  .array(allocationItemSchema)
  .min(1, "Select at least one charge.");

export const allocatePaymentInputSchema = z.object({
  allocationsJson: z.string().min(2, "Select at least one charge."),
  reason: reasonSchema,
});

export const reallocatePaymentInputSchema = z.object({
  fromAllocationId: z.uuid("Select a source allocation."),
  toChargeId: z.uuid("Select a target charge."),
  amount: positiveMoneySchema,
  reason: reasonSchema,
});

export const reversePaymentInputSchema = z.object({
  amount: positiveMoneySchema,
  reason: reasonSchema,
});

export const createDepositInputSchema = z.object({
  leaseId: z.uuid("Select a lease."),
  requiredAmount: moneySchema,
  notes: optionalText(1000, "Notes are too long."),
});

export const depositTransactionInputSchema = z.object({
  transactionType: z.enum(["refund", "deduction", "adjustment"]),
  direction: z.enum(["decrease", "increase"]),
  amount: positiveMoneySchema,
  transactionDate: dateSchema,
  transactionReference: referenceSchema,
  reason: reasonSchema,
});

export const issueReceiptInputSchema = z.object({
  notes: optionalText(1000, "Notes are too long."),
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

const embeddedTenantSchema = z.object({
  id: z.uuid(),
  full_name: z.string(),
  phone: z.string().optional(),
  email: z.string().nullable().optional(),
});

const embeddedUnitSchema = z.object({
  id: z.uuid(),
  unit_number: z.string(),
  property_id: z.uuid().optional(),
  properties: z.union([embeddedPropertySchema, z.array(embeddedPropertySchema)]).nullish(),
});

export const embeddedLeaseSchema = z.object({
  id: z.uuid(),
  tenant_id: z.uuid(),
  unit_id: z.uuid(),
  status: z.string(),
  monthly_rent: dbNumberSchema,
  rent_due_day: z.number().optional(),
  deposit_amount: dbNumberSchema.optional(),
  tenants: z.union([embeddedTenantSchema, z.array(embeddedTenantSchema)]).nullish(),
  units: z.union([embeddedUnitSchema, z.array(embeddedUnitSchema)]).nullish(),
});

const embeddedMethodSchema = z.object({
  code: z.string(),
  name: z.string(),
});

const embeddedReceiptSchema = z.object({
  id: z.uuid(),
  receipt_number: z.string(),
});

const embeddedArrayOrObject = <T extends z.ZodTypeAny>(schema: T) =>
  z.union([schema, z.array(schema)]).nullish();

export const paymentMethodSchema = z.object({
  id: z.uuid(),
  code: z.string(),
  name: z.string(),
  requires_reference: z.boolean(),
  is_active: z.boolean(),
});

export const chargeRowSchema = z.object({
  id: z.uuid(),
  lease_id: z.uuid(),
  period_month: z.string(),
  period_start: z.string(),
  period_end: z.string(),
  due_date: z.string(),
  amount: dbNumberSchema,
  source: z.string(),
  notes: z.string().nullable().optional(),
  created_at: z.string().optional(),
  leases: embeddedArrayOrObject(embeddedLeaseSchema),
});

export const paymentRowSchema = z.object({
  id: z.uuid(),
  tenant_id: z.uuid(),
  lease_id: z.uuid(),
  payment_type: z.string(),
  payment_method_id: z.uuid(),
  amount: dbNumberSchema,
  payment_date: z.string(),
  transaction_reference: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  created_at: z.string().optional(),
  payment_methods: embeddedArrayOrObject(embeddedMethodSchema),
  tenants: embeddedArrayOrObject(embeddedTenantSchema),
  leases: embeddedArrayOrObject(embeddedLeaseSchema),
  receipts: embeddedArrayOrObject(embeddedReceiptSchema),
});

export const allocationRowSchema = z.object({
  id: z.uuid(),
  payment_id: z.uuid(),
  charge_id: z.uuid(),
  amount: dbNumberSchema,
  allocated_at: z.string().optional(),
});

export const adjustmentRowSchema = z.object({
  id: z.uuid(),
  payment_id: z.uuid().nullable(),
  charge_id: z.uuid(),
  allocation_id: z.uuid().nullable().optional(),
  adjustment_type: z.string(),
  amount_delta: dbNumberSchema,
  reason: z.string(),
  created_by: z.uuid(),
  created_at: z.string().optional(),
});

export const reversalRowSchema = z.object({
  id: z.uuid(),
  payment_id: z.uuid(),
  amount: dbNumberSchema,
  reason: z.string(),
  created_by: z.uuid(),
  created_at: z.string().optional(),
});

export const depositRowSchema = z.object({
  id: z.uuid(),
  lease_id: z.uuid(),
  required_amount: dbNumberSchema,
  notes: z.string().nullable().optional(),
  created_at: z.string().optional(),
  leases: embeddedArrayOrObject(embeddedLeaseSchema),
});

export const depositTransactionRowSchema = z.object({
  id: z.uuid(),
  deposit_id: z.uuid(),
  transaction_type: z.string(),
  amount: dbNumberSchema,
  transaction_date: z.string(),
  payment_id: z.uuid().nullable().optional(),
  transaction_reference: z.string().nullable().optional(),
  reason: z.string(),
  created_by: z.uuid(),
  created_at: z.string().optional(),
  payment_methods: embeddedArrayOrObject(embeddedMethodSchema),
});

export const receiptPaymentSchema = z.object({
  id: z.uuid(),
  tenant_id: z.uuid(),
  lease_id: z.uuid(),
  payment_type: z.string(),
  amount: dbNumberSchema,
  payment_date: z.string(),
  transaction_reference: z.string().nullable().optional(),
  payment_methods: embeddedArrayOrObject(embeddedMethodSchema),
  tenants: embeddedArrayOrObject(embeddedTenantSchema),
  leases: embeddedArrayOrObject(embeddedLeaseSchema),
});

export const receiptRowSchema = z.object({
  id: z.uuid(),
  receipt_number: z.string(),
  payment_id: z.uuid(),
  issued_at: z.string(),
  issued_by: z.uuid().nullable().optional(),
  notes: z.string().nullable().optional(),
  payments: embeddedArrayOrObject(receiptPaymentSchema),
});

export const auditRowSchema = z.object({
  id: z.uuid(),
  entity_type: z.string(),
  entity_id: z.uuid().nullable(),
  action: z.string(),
  reason: z.string(),
  actor_email: z.string().nullable().optional(),
  created_at: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Normalized row types used by queries and UI
// ---------------------------------------------------------------------------

export type PropertyOption = z.infer<typeof embeddedPropertySchema>;
export type TenantOption = z.infer<typeof embeddedTenantSchema>;
export type UnitOption = z.infer<typeof embeddedUnitSchema>;

export type EmbeddedLeaseRow = z.infer<typeof embeddedLeaseSchema>;
export type EmbeddedLease = Omit<EmbeddedLeaseRow, "tenants" | "units"> & {
  tenants: TenantOption | null;
  units: (Omit<UnitOption, "properties"> & { properties: PropertyOption | null }) | null;
};

export type EmbeddedMethod = z.infer<typeof embeddedMethodSchema>;
export type ChargeRow = z.infer<typeof chargeRowSchema>;
export type ChargeRecord = Omit<ChargeRow, "leases"> & { leases: EmbeddedLease | null };
export type PaymentRow = z.infer<typeof paymentRowSchema>;
export type PaymentRecord = Omit<
  PaymentRow,
  "payment_methods" | "tenants" | "leases" | "receipts"
> & {
  payment_methods: EmbeddedMethod | null;
  tenants: TenantOption | null;
  leases: EmbeddedLease | null;
  receipts: { id: string; receipt_number: string } | null;
};
export type AllocationRecord = z.infer<typeof allocationRowSchema>;
export type AdjustmentRecord = z.infer<typeof adjustmentRowSchema>;
export type ReversalRecord = z.infer<typeof reversalRowSchema>;
export type DepositRow = z.infer<typeof depositRowSchema>;
export type DepositRecord = Omit<DepositRow, "leases"> & { leases: EmbeddedLease | null };
export type DepositTransactionRow = z.infer<typeof depositTransactionRowSchema>;
export type DepositTransactionRecord = Omit<DepositTransactionRow, "payment_methods"> & {
  payment_methods: EmbeddedMethod | null;
};
export type ReceiptRow = z.infer<typeof receiptRowSchema>;
export type ReceiptRecord = Omit<ReceiptRow, "payments"> & {
  payments: Omit<z.infer<typeof receiptPaymentSchema>, "payment_methods" | "tenants" | "leases"> & {
    payment_methods: EmbeddedMethod | null;
    tenants: TenantOption | null;
    leases: EmbeddedLease | null;
  } | null;
};
export type AuditRecord = z.infer<typeof auditRowSchema>;
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

export function formStateFromZod(error: z.ZodError): FinanceFormState {
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

export function allocationBatchFromJson(value: string) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return null;
  }
  const result = allocationBatchSchema.safeParse(parsed);
  return result.success ? result.data : null;
}
