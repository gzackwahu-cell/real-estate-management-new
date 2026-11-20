"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { AuthorizedContext } from "@/lib/auth/dal";
import { withPermission } from "@/lib/auth/guards";
import type { ActionName, ModuleName } from "@/lib/auth/roles";
import type { MaintenanceClient } from "./queries";
import {
  addMaintenanceNoteInputSchema,
  assignMaintenanceInputSchema,
  createMaintenanceRequestInputSchema,
  formStateFromZod,
  formText,
  maintenanceExpenseInputSchema,
  updateMaintenanceStatusInputSchema,
  type MaintenanceFormState,
} from "./validation";

type MutationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

type MutationHandler<T> = (
  context: AuthorizedContext,
  supabase: MaintenanceClient,
) => Promise<T>;

const SAVE_ERROR = "The maintenance change could not be saved. Check the details and try again.";

const ALLOWED_ERRORS = [
  "You do not have permission",
  "You are not assigned to this property.",
  "A title and description are required.",
  "Select a valid",
  "Select an active authorized staff member.",
  "Completed or cancelled requests cannot",
  "A resolution is required",
  "Enter a work note.",
  "Enter an expense description.",
  "Expense amount must be greater than zero.",
  "Select a different status.",
  "The selected unit",
  "The selected request",
  "The tenant does not",
  "Property not found.",
  "Tenant not found.",
  "Maintenance request not found.",
  "Expense record not found.",
];

function safeMutationError(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
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

function requireRpcValue<T>(data: unknown, schema: z.ZodType<T>): T {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw new Error(SAVE_ERROR);
  }
  return parsed.data;
}

function revalidateMaintenance(ids: string[] = []) {
  revalidatePath("/dashboard/maintenance");
  revalidatePath("/dashboard/maintenance/requests");
  revalidatePath("/dashboard/maintenance/expenses");
  revalidatePath("/tenant");
  revalidatePath("/tenant/maintenance");
  for (const id of ids) {
    if (validId(id)) {
      revalidatePath(`/dashboard/maintenance/requests/${id}`);
      revalidatePath(`/tenant/maintenance/${id}`);
    }
  }
}

export async function createMaintenanceRequestAction(
  _previousState: MaintenanceFormState,
  formData: FormData,
): Promise<MaintenanceFormState> {
  const parsed = createMaintenanceRequestInputSchema.safeParse({
    propertyId: formText(formData, "propertyId"),
    unitId: formText(formData, "unitId"),
    tenantId: formText(formData, "tenantId"),
    title: formText(formData, "title"),
    description: formText(formData, "description"),
    category: formText(formData, "category"),
    priority: formText(formData, "priority"),
    reportedDate: formText(formData, "reportedDate"),
    tenantContact: formText(formData, "tenantContact"),
    notes: formText(formData, "notes"),
    portal: formText(formData, "portal") || "staff",
  });
  if (!parsed.success) {
    return formStateFromZod(parsed.error);
  }

  const result = await runMutation("maintenance", "create", async (_context, supabase) => {
    const { data, error } = await supabase.rpc("create_maintenance_request", {
      p_property_id: parsed.data.propertyId,
      p_unit_id: parsed.data.unitId,
      p_tenant_id: parsed.data.tenantId,
      p_title: parsed.data.title,
      p_description: parsed.data.description,
      p_category: parsed.data.category,
      p_priority: parsed.data.priority,
      p_reported_date: parsed.data.reportedDate,
      p_tenant_contact: parsed.data.tenantContact || null,
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

  revalidateMaintenance([result.value]);
  redirect(
    parsed.data.portal === "tenant"
      ? "/tenant/maintenance"
      : `/dashboard/maintenance/requests/${result.value}`,
  );
}

export async function assignMaintenanceRequestAction(
  requestId: string,
  _previousState: MaintenanceFormState,
  formData: FormData,
): Promise<MaintenanceFormState> {
  if (!validId(requestId)) {
    return { error: "Invalid maintenance request." };
  }

  const parsed = assignMaintenanceInputSchema.safeParse({
    assignedTo: formText(formData, "assignedTo"),
    note: formText(formData, "note"),
  });
  if (!parsed.success) {
    return formStateFromZod(parsed.error);
  }

  const result = await runMutation("maintenance", "edit", async (_context, supabase) => {
    const { error } = await supabase.rpc("assign_maintenance_request", {
      p_request_id: requestId,
      p_assigned_to: parsed.data.assignedTo,
      p_note: parsed.data.note || null,
    });
    if (error) {
      throw new Error(error.message);
    }
    return requestId;
  });

  if (!result.ok) {
    return { error: result.error };
  }

  revalidateMaintenance([requestId]);
  return { success: "Assignment saved and the tenant was notified." };
}

export async function updateMaintenanceStatusAction(
  requestId: string,
  _previousState: MaintenanceFormState,
  formData: FormData,
): Promise<MaintenanceFormState> {
  if (!validId(requestId)) {
    return { error: "Invalid maintenance request." };
  }

  const parsed = updateMaintenanceStatusInputSchema.safeParse({
    status: formText(formData, "status"),
    note: formText(formData, "note"),
    resolution: formText(formData, "resolution"),
  });
  if (!parsed.success) {
    return formStateFromZod(parsed.error);
  }

  const result = await runMutation("maintenance", "edit", async (_context, supabase) => {
    const { error } = await supabase.rpc("update_maintenance_status", {
      p_request_id: requestId,
      p_status: parsed.data.status,
      p_note: parsed.data.note || null,
      p_resolution: parsed.data.resolution || null,
    });
    if (error) {
      throw new Error(error.message);
    }
    return requestId;
  });

  if (!result.ok) {
    return { error: result.error };
  }

  revalidateMaintenance([requestId]);
  return { success: "Status updated, recorded in the history and notified." };
}

export async function addMaintenanceNoteAction(
  requestId: string,
  _previousState: MaintenanceFormState,
  formData: FormData,
): Promise<MaintenanceFormState> {
  if (!validId(requestId)) {
    return { error: "Invalid maintenance request." };
  }

  const parsed = addMaintenanceNoteInputSchema.safeParse({
    note: formText(formData, "note"),
  });
  if (!parsed.success) {
    return formStateFromZod(parsed.error);
  }

  const result = await runMutation("maintenance", "edit", async (_context, supabase) => {
    const { error } = await supabase.rpc("add_maintenance_note", {
      p_request_id: requestId,
      p_note: parsed.data.note,
    });
    if (error) {
      throw new Error(error.message);
    }
    return requestId;
  });

  if (!result.ok) {
    return { error: result.error };
  }

  revalidateMaintenance([requestId]);
  return { success: "Work note added." };
}

export async function createMaintenanceExpenseAction(
  _previousState: MaintenanceFormState,
  formData: FormData,
): Promise<MaintenanceFormState> {
  const parsed = maintenanceExpenseInputSchema.safeParse({
    propertyId: formText(formData, "propertyId"),
    maintenanceRequestId: formText(formData, "maintenanceRequestId"),
    category: formText(formData, "category"),
    vendor: formText(formData, "vendor"),
    description: formText(formData, "description"),
    amount: formText(formData, "amount"),
    paymentStatus: formText(formData, "paymentStatus"),
    expenseDate: formText(formData, "expenseDate"),
    reference: formText(formData, "reference"),
  });
  if (!parsed.success) {
    return formStateFromZod(parsed.error);
  }

  const result = await runMutation("expenses", "create", async (_context, supabase) => {
    const { data, error } = await supabase.rpc("record_maintenance_expense", {
      p_property_id: parsed.data.propertyId,
      p_maintenance_request_id: parsed.data.maintenanceRequestId,
      p_category: parsed.data.category,
      p_vendor: parsed.data.vendor || null,
      p_description: parsed.data.description,
      p_amount: parsed.data.amount,
      p_payment_status: parsed.data.paymentStatus,
      p_expense_date: parsed.data.expenseDate,
      p_reference: parsed.data.reference || null,
    });
    if (error) {
      throw new Error(error.message);
    }
    return requireRpcValue(data, z.uuid());
  });

  if (!result.ok) {
    return { error: result.error };
  }

  revalidateMaintenance([result.value]);
  return { success: "Maintenance expense recorded in the separate cost ledger." };
}

export async function updateMaintenanceExpenseAction(
  expenseId: string,
  _previousState: MaintenanceFormState,
  formData: FormData,
): Promise<MaintenanceFormState> {
  if (!validId(expenseId)) {
    return { error: "Invalid expense record." };
  }

  const parsed = maintenanceExpenseInputSchema.safeParse({
    propertyId: formText(formData, "propertyId"),
    maintenanceRequestId: formText(formData, "maintenanceRequestId"),
    category: formText(formData, "category"),
    vendor: formText(formData, "vendor"),
    description: formText(formData, "description"),
    amount: formText(formData, "amount"),
    paymentStatus: formText(formData, "paymentStatus"),
    expenseDate: formText(formData, "expenseDate"),
    reference: formText(formData, "reference"),
  });
  if (!parsed.success) {
    return formStateFromZod(parsed.error);
  }

  const result = await runMutation("expenses", "edit", async (_context, supabase) => {
    const { error } = await supabase.rpc("update_maintenance_expense", {
      p_expense_id: expenseId,
      p_property_id: parsed.data.propertyId,
      p_maintenance_request_id: parsed.data.maintenanceRequestId,
      p_category: parsed.data.category,
      p_vendor: parsed.data.vendor || null,
      p_description: parsed.data.description,
      p_amount: parsed.data.amount,
      p_payment_status: parsed.data.paymentStatus,
      p_expense_date: parsed.data.expenseDate,
      p_reference: parsed.data.reference || null,
    });
    if (error) {
      throw new Error(error.message);
    }
    return expenseId;
  });

  if (!result.ok) {
    return { error: result.error };
  }

  revalidateMaintenance([expenseId]);
  return { success: "Maintenance expense updated." };
}
