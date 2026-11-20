"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { AuthorizedContext } from "@/lib/auth/dal";
import { withPermission } from "@/lib/auth/guards";
import type { ActionName, ModuleName } from "@/lib/auth/roles";
import type { FinanceClient } from "./queries";
import {
  adjustChargeInputSchema,
  allocatePaymentInputSchema,
  allocationBatchFromJson,
  createDepositInputSchema,
  depositTransactionInputSchema,
  formStateFromZod,
  formText,
  generateChargesInputSchema,
  issueReceiptInputSchema,
  recordPaymentInputSchema,
  reallocatePaymentInputSchema,
  reversePaymentInputSchema,
  type FinanceFormState,
} from "./validation";

type MutationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

type MutationHandler<T> = (
  context: AuthorizedContext,
  supabase: FinanceClient,
) => Promise<T>;

const SAVE_ERROR = "The financial change could not be saved. Check the details and try again.";

const ALLOWED_ERRORS = [
  "You do not have permission",
  "You are not assigned to this property.",
  "A reason is required",
  "Enter a reason",
  "Select a valid",
  "Select an active payment method.",
  "A transaction reference is required",
  "Payment amount must be greater than zero.",
  "Reversal amount must be greater than zero.",
  "Reallocation amount must be greater than zero.",
  "Allocation amounts must be greater than zero.",
  "Select at least one charge.",
  "The selected charge",
  "The charge and payment belong to different leases.",
  "Only rent payments can be allocated",
  "Allocation exceeds",
  "Reallocation exceeds",
  "Reversal exceeds",
  "Source allocation not found.",
  "Target charge not found.",
  "Payment not found.",
  "Lease not found.",
  "Rent charge not found.",
  "Deposit record not found.",
  "Deposit amount cannot be negative.",
  "Deposit balance cannot become negative.",
  "Deposit payments must be positive.",
  "Enter refunds and deductions as negative amounts.",
  "Select a payment method for deposit payments.",
  "Invalid payment type.",
  "The lease does not belong to this tenant.",
  "An adjustment cannot",
  "Enter a non-zero adjustment amount.",
  "Confirmed payments are immutable",
  "Confirmed payments cannot be deleted",
];

function safeMutationError(error: unknown): string {
  const message = error instanceof Error ? error.message : "";

  if (message.includes("payments_reference_key")) {
    return "That transaction reference has already been recorded.";
  }
  if (message.includes("rent_charges_lease_period_key")) {
    return "A rent charge already exists for this lease and period.";
  }
  if (message.includes("payment_allocations_payment_charge_key")) {
    return "That payment is already allocated to this charge. Edit the existing allocation instead.";
  }
  if (ALLOWED_ERRORS.some((allowed) => message.includes(allowed))) {
    return message;
  }
  return SAVE_ERROR;
}

async function runMutation<T>(
  module: ModuleName,
  action: ActionName,
  handler: MutationHandler<T>,
): Promise<MutationResult<T>> {
  let result: MutationResult<T> | undefined;

  // withPermission may redirect; keep it outside try/catch so redirects are not
  // converted into form errors.
  await withPermission(module, action, async (context, supabase) => {
    try {
      result = { ok: true, value: await handler(context, supabase) };
    } catch (error) {
      result = { ok: false, error: safeMutationError(error) };
    }
  });

  return result ?? { ok: false, error: SAVE_ERROR };
}

function validId(value: string): boolean {
  return z.uuid().safeParse(value).success;
}

function revalidateFinance(ids: string[] = []) {
  revalidatePath("/dashboard/finance");
  revalidatePath("/dashboard/finance/charges");
  revalidatePath("/dashboard/finance/payments");
  revalidatePath("/dashboard/finance/deposits");
  revalidatePath("/dashboard/finance/receipts");
  revalidatePath("/dashboard/leases");
  revalidatePath("/tenant");
  for (const id of ids) {
    if (validId(id)) {
      revalidatePath(`/dashboard/finance/payments/${id}`);
      revalidatePath(`/dashboard/finance/deposits/${id}`);
      revalidatePath(`/dashboard/leases/${id}`);
      revalidatePath(`/dashboard/tenants/${id}`);
    }
  }
}

function requireRpcValue<T>(data: unknown, schema: z.ZodType<T>): T {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw new Error(SAVE_ERROR);
  }
  return parsed.data;
}

export async function generateRentChargesAction(
  _previousState: FinanceFormState,
  formData: FormData,
): Promise<FinanceFormState> {
  const parsed = generateChargesInputSchema.safeParse({
    periodMonth: formText(formData, "periodMonth"),
  });
  if (!parsed.success) {
    return formStateFromZod(parsed.error);
  }

  const periodMonth = `${parsed.data.periodMonth}-01`;
  const result = await runMutation("rent", "create", async (_context, supabase) => {
    const { data, error } = await supabase.rpc("generate_rent_charges", {
      p_period_month: periodMonth,
    });
    if (error) {
      throw new Error(error.message);
    }
    return requireRpcValue(data, z.number().int().nonnegative());
  });

  if (!result.ok) {
    return { error: result.error };
  }

  revalidateFinance();
  return {
    success:
      result.value === 0
        ? "No new charges were needed for that month. Existing charges were left unchanged."
        : `${result.value} rent charge(s) generated. Existing charges were left unchanged.`,
  };
}

export async function adjustRentChargeAction(
  chargeId: string,
  _previousState: FinanceFormState,
  formData: FormData,
): Promise<FinanceFormState> {
  if (!validId(chargeId)) {
    return { error: "Invalid rent charge." };
  }

  const parsed = adjustChargeInputSchema.safeParse({
    amountDelta: formText(formData, "amountDelta"),
    reason: formText(formData, "reason"),
  });
  if (!parsed.success) {
    return formStateFromZod(parsed.error);
  }

  const result = await runMutation("rent", "approve", async (_context, supabase) => {
    const { error } = await supabase.rpc("adjust_rent_charge", {
      p_charge_id: chargeId,
      p_amount_delta: parsed.data.amountDelta,
      p_reason: parsed.data.reason,
    });
    if (error) {
      throw new Error(error.message);
    }
    return chargeId;
  });

  if (!result.ok) {
    return { error: result.error };
  }

  revalidateFinance();
  return { success: "Charge adjustment recorded with an audit entry." };
}

export async function recordPaymentAction(
  _previousState: FinanceFormState,
  formData: FormData,
): Promise<FinanceFormState> {
  const parsed = recordPaymentInputSchema.safeParse({
    tenantId: formText(formData, "tenantId"),
    leaseId: formText(formData, "leaseId"),
    paymentType: formText(formData, "paymentType"),
    paymentMethodId: formText(formData, "paymentMethodId"),
    amount: formText(formData, "amount"),
    paymentDate: formText(formData, "paymentDate"),
    transactionReference: formText(formData, "transactionReference"),
    notes: formText(formData, "notes"),
    allocateRent: formData.get("allocateRent") === "on",
  });
  if (!parsed.success) {
    return formStateFromZod(parsed.error);
  }

  const result = await runMutation("payments", "create", async (_context, supabase) => {
    const { data, error } = await supabase.rpc("record_payment", {
      p_tenant_id: parsed.data.tenantId,
      p_lease_id: parsed.data.leaseId,
      p_payment_type: parsed.data.paymentType,
      p_payment_method_id: parsed.data.paymentMethodId,
      p_amount: parsed.data.amount,
      p_payment_date: parsed.data.paymentDate,
      p_transaction_reference: parsed.data.transactionReference || null,
      p_notes: parsed.data.notes || null,
      p_allocate_rent: parsed.data.paymentType === "rent" && parsed.data.allocateRent,
    });
    if (error) {
      throw new Error(error.message);
    }
    return requireRpcValue(
      data,
      z.object({ payment_id: z.uuid(), receipt_id: z.uuid() }),
    );
  });

  if (!result.ok) {
    return { error: result.error };
  }

  revalidateFinance([result.value.payment_id]);
  redirect(`/dashboard/finance/payments/${result.value.payment_id}`);
}

export async function allocatePaymentAction(
  paymentId: string,
  _previousState: FinanceFormState,
  formData: FormData,
): Promise<FinanceFormState> {
  if (!validId(paymentId)) {
    return { error: "Invalid payment record." };
  }

  const parsed = allocatePaymentInputSchema.safeParse({
    allocationsJson: formText(formData, "allocationsJson"),
    reason: formText(formData, "reason"),
  });
  if (!parsed.success) {
    return formStateFromZod(parsed.error);
  }

  const allocations = allocationBatchFromJson(parsed.data.allocationsJson);
  if (!allocations) {
    return {
      error: "Select at least one charge with a valid amount before allocating.",
    };
  }

  const result = await runMutation("payments", "edit", async (_context, supabase) => {
    const { error } = await supabase.rpc("allocate_payment", {
      p_payment_id: paymentId,
      p_allocations: allocations.map((item) => ({
        chargeId: item.chargeId,
        amount: item.amount,
      })),
      p_reason: parsed.data.reason,
    });
    if (error) {
      throw new Error(error.message);
    }
    return paymentId;
  });

  if (!result.ok) {
    return { error: result.error };
  }

  revalidateFinance([paymentId]);
  return { success: "Payment allocated to the selected charges." };
}

export async function reallocatePaymentAction(
  paymentId: string,
  _previousState: FinanceFormState,
  formData: FormData,
): Promise<FinanceFormState> {
  if (!validId(paymentId)) {
    return { error: "Invalid payment record." };
  }

  const parsed = reallocatePaymentInputSchema.safeParse({
    fromAllocationId: formText(formData, "fromAllocationId"),
    toChargeId: formText(formData, "toChargeId"),
    amount: formText(formData, "amount"),
    reason: formText(formData, "reason"),
  });
  if (!parsed.success) {
    return formStateFromZod(parsed.error);
  }

  const result = await runMutation("payments", "approve", async (_context, supabase) => {
    const { error } = await supabase.rpc("reallocate_payment", {
      p_from_allocation_id: parsed.data.fromAllocationId,
      p_to_charge_id: parsed.data.toChargeId,
      p_amount: parsed.data.amount,
      p_reason: parsed.data.reason,
    });
    if (error) {
      throw new Error(error.message);
    }
    return paymentId;
  });

  if (!result.ok) {
    return { error: result.error };
  }

  revalidateFinance([paymentId]);
  return { success: "Allocation moved with an audit record." };
}

export async function reversePaymentAction(
  paymentId: string,
  _previousState: FinanceFormState,
  formData: FormData,
): Promise<FinanceFormState> {
  if (!validId(paymentId)) {
    return { error: "Invalid payment record." };
  }

  const parsed = reversePaymentInputSchema.safeParse({
    amount: formText(formData, "amount"),
    reason: formText(formData, "reason"),
  });
  if (!parsed.success) {
    return formStateFromZod(parsed.error);
  }

  const result = await runMutation("payments", "approve", async (_context, supabase) => {
    const { error } = await supabase.rpc("reverse_payment", {
      p_payment_id: paymentId,
      p_amount: parsed.data.amount,
      p_reason: parsed.data.reason,
    });
    if (error) {
      throw new Error(error.message);
    }
    return paymentId;
  });

  if (!result.ok) {
    return { error: result.error };
  }

  revalidateFinance([paymentId]);
  return { success: "Reversal recorded. The original payment was retained." };
}

export async function createDepositAction(
  _previousState: FinanceFormState,
  formData: FormData,
): Promise<FinanceFormState> {
  const parsed = createDepositInputSchema.safeParse({
    leaseId: formText(formData, "leaseId"),
    requiredAmount: formText(formData, "requiredAmount"),
    notes: formText(formData, "notes"),
  });
  if (!parsed.success) {
    return formStateFromZod(parsed.error);
  }

  const result = await runMutation("deposits", "create", async (_context, supabase) => {
    const { data, error } = await supabase.rpc("create_deposit_for_lease", {
      p_lease_id: parsed.data.leaseId,
      p_required_amount: parsed.data.requiredAmount,
      p_notes: parsed.data.notes || null,
    });
    if (error) {
      throw new Error(error.message);
    }
    return requireRpcValue(data, z.uuid());
  });

  if (!result.ok) {
    return { error: result.error };
  }

  revalidateFinance([parsed.data.leaseId]);
  return { success: "Deposit record created." };
}

export async function recordDepositTransactionAction(
  depositId: string,
  _previousState: FinanceFormState,
  formData: FormData,
): Promise<FinanceFormState> {
  if (!validId(depositId)) {
    return { error: "Invalid deposit record." };
  }

  const parsed = depositTransactionInputSchema.safeParse({
    transactionType: formText(formData, "transactionType"),
    direction: formText(formData, "direction"),
    amount: formText(formData, "amount"),
    transactionDate: formText(formData, "transactionDate"),
    transactionReference: formText(formData, "transactionReference"),
    reason: formText(formData, "reason"),
  });
  if (!parsed.success) {
    return formStateFromZod(parsed.error);
  }

  const signedAmount =
    parsed.data.transactionType === "adjustment" && parsed.data.direction === "increase"
      ? parsed.data.amount
      : -parsed.data.amount;

  const result = await runMutation("deposits", "edit", async (_context, supabase) => {
    const { error } = await supabase.rpc("record_deposit_transaction", {
      p_deposit_id: depositId,
      p_transaction_type: parsed.data.transactionType,
      p_amount: signedAmount,
      p_transaction_date: parsed.data.transactionDate,
      p_payment_method_id: null,
      p_transaction_reference: parsed.data.transactionReference || null,
      p_reason: parsed.data.reason,
    });
    if (error) {
      throw new Error(error.message);
    }
    return depositId;
  });

  if (!result.ok) {
    return { error: result.error };
  }

  revalidateFinance([depositId]);
  return { success: "Deposit transaction recorded with a reason and audit entry." };
}

export async function issueReceiptAction(
  paymentId: string,
  _previousState: FinanceFormState,
  formData: FormData,
): Promise<FinanceFormState> {
  if (!validId(paymentId)) {
    return { error: "Invalid payment record." };
  }

  const parsed = issueReceiptInputSchema.safeParse({
    notes: formText(formData, "notes"),
  });
  if (!parsed.success) {
    return formStateFromZod(parsed.error);
  }

  const result = await runMutation("payments", "edit", async (_context, supabase) => {
    const { data, error } = await supabase.rpc("issue_receipt", {
      p_payment_id: paymentId,
      p_notes: parsed.data.notes || null,
    });
    if (error) {
      throw new Error(error.message);
    }
    return requireRpcValue(data, z.uuid());
  });

  if (!result.ok) {
    return { error: result.error };
  }

  revalidateFinance([paymentId]);
  redirect(`/dashboard/finance/receipts/${result.value}`);
}
