"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { AuthorizedContext } from "@/lib/auth/dal";
import { withPermission } from "@/lib/auth/guards";
import type { ActionName, ModuleName } from "@/lib/auth/roles";
import type { TenancyClient } from "./queries";
import {
  applicationInputSchema,
  applicationReviewInputSchema,
  formStateFromZod,
  formText,
  leaseInputSchema,
  tenantInputSchema,
  type TenancyFormState,
} from "./validation";

type MutationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

type MutationHandler<T> = (
  context: AuthorizedContext,
  supabase: TenancyClient,
) => Promise<T>;

const SAVE_ERROR =
  "The change could not be saved. Check the details and try again.";

const ALLOWED_ERRORS = [
  "The selected unit is not available for applications.",
  "The selected unit is inactive.",
  "Only active tenants can be linked to a new lease.",
  "A renewal must start after the current lease ends.",
  "This application is already closed.",
  "The source application must be approved and match this tenant and unit.",
  "Terminated leases require a termination date and reason.",
  "Record termination details when editing an existing lease.",
  "Termination details are only valid for terminated leases.",
  "You are not assigned to this property.",
];

function safeMutationError(error: unknown): string {
  const message = error instanceof Error ? error.message : "";

  if (ALLOWED_ERRORS.some((allowed) => message.includes(allowed))) {
    return message;
  }
  if (message.includes("tenants_id_reference_key")) {
    return "That ID or reference number is already registered.";
  }
  if (message.includes("rental_applications_open_key")) {
    return "An open application already exists for this applicant and unit.";
  }
  if (message.includes("leases_no_unit_overlap")) {
    return "The unit already has an active or pending lease covering these dates.";
  }
  if (message.includes("leases_source_application_key")) {
    return "A lease has already been created from this application.";
  }

  return SAVE_ERROR;
}

async function runMutation<T>(
  module: ModuleName,
  action: ActionName,
  handler: MutationHandler<T>,
): Promise<MutationResult<T>> {
  let result: MutationResult<T> | undefined;

  // withPermission may redirect. It stays outside the try/catch so a framework
  // redirect is never converted into a form error.
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

function tenantFormValues(formData: FormData) {
  return {
    fullName: formText(formData, "fullName"),
    phone: formText(formData, "phone"),
    email: formText(formData, "email"),
    idReference: formText(formData, "idReference"),
    address: formText(formData, "address"),
    emergencyContactName: formText(formData, "emergencyContactName"),
    emergencyContactPhone: formText(formData, "emergencyContactPhone"),
    status: formText(formData, "status"),
  };
}

function applicationFormValues(formData: FormData) {
  return {
    unitId: formText(formData, "unitId"),
    applicantFullName: formText(formData, "applicantFullName"),
    applicantPhone: formText(formData, "applicantPhone"),
    applicantEmail: formText(formData, "applicantEmail"),
    applicantIdReference: formText(formData, "applicantIdReference"),
    applicantAddress: formText(formData, "applicantAddress"),
    proposedRent: formText(formData, "proposedRent"),
    applicationDate: formText(formData, "applicationDate"),
    notes: formText(formData, "notes"),
  };
}

function leaseFormValues(formData: FormData) {
  return {
    tenantId: formText(formData, "tenantId"),
    unitId: formText(formData, "unitId"),
    startDate: formText(formData, "startDate"),
    endDate: formText(formData, "endDate"),
    monthlyRent: formText(formData, "monthlyRent"),
    securityDepositRequired: formData.get("securityDepositRequired") === "on",
    rentDueDay: formText(formData, "rentDueDay"),
    status: formText(formData, "status"),
    specialTerms: formText(formData, "specialTerms"),
    notes: formText(formData, "notes"),
    terminatedOn: formText(formData, "terminatedOn"),
    terminationReason: formText(formData, "terminationReason"),
    sourceApplicationId: formText(formData, "sourceApplicationId"),
    renewalOf: formText(formData, "renewalOf"),
  };
}

export async function createTenantAction(
  _previousState: TenancyFormState,
  formData: FormData,
): Promise<TenancyFormState> {
  const parsed = tenantInputSchema.safeParse(tenantFormValues(formData));
  if (!parsed.success) {
    return formStateFromZod(parsed.error);
  }

  const result = await runMutation("tenants", "create", async (context, supabase) => {
    const { data, error } = await supabase
      .from("tenants")
      .insert({
        full_name: parsed.data.fullName,
        phone: parsed.data.phone,
        email: parsed.data.email || null,
        id_reference: parsed.data.idReference,
        address: parsed.data.address,
        emergency_contact_name: parsed.data.emergencyContactName || null,
        emergency_contact_phone: parsed.data.emergencyContactPhone || null,
        status: parsed.data.status,
        created_by: context.userId,
        updated_by: context.userId,
      })
      .select("id")
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? SAVE_ERROR);
    }

    return z.uuid().parse(data.id);
  });

  if (!result.ok) {
    return { error: result.error };
  }

  revalidatePath("/dashboard/tenants");
  redirect(`/dashboard/tenants/${result.value}`);
}

export async function updateTenantAction(
  tenantId: string,
  _previousState: TenancyFormState,
  formData: FormData,
): Promise<TenancyFormState> {
  if (!validId(tenantId)) {
    return { error: "Invalid tenant record." };
  }

  const parsed = tenantInputSchema.safeParse(tenantFormValues(formData));
  if (!parsed.success) {
    return formStateFromZod(parsed.error);
  }

  const result = await runMutation("tenants", "edit", async (context, supabase) => {
    const { error } = await supabase
      .from("tenants")
      .update({
        full_name: parsed.data.fullName,
        phone: parsed.data.phone,
        email: parsed.data.email || null,
        id_reference: parsed.data.idReference,
        address: parsed.data.address,
        emergency_contact_name: parsed.data.emergencyContactName || null,
        emergency_contact_phone: parsed.data.emergencyContactPhone || null,
        status: parsed.data.status,
        updated_by: context.userId,
      })
      .eq("id", tenantId);

    if (error) {
      throw new Error(error.message);
    }

    return tenantId;
  });

  if (!result.ok) {
    return { error: result.error };
  }

  revalidatePath("/dashboard/tenants");
  revalidatePath(`/dashboard/tenants/${tenantId}`);
  redirect(`/dashboard/tenants/${tenantId}`);
}

export async function createApplicationAction(
  _previousState: TenancyFormState,
  formData: FormData,
): Promise<TenancyFormState> {
  const parsed = applicationInputSchema.safeParse(applicationFormValues(formData));
  if (!parsed.success) {
    return formStateFromZod(parsed.error);
  }

  const result = await runMutation("tenants", "create", async (context, supabase) => {
    const { data, error } = await supabase
      .from("rental_applications")
      .insert({
        unit_id: parsed.data.unitId,
        applicant_full_name: parsed.data.applicantFullName,
        applicant_phone: parsed.data.applicantPhone,
        applicant_email: parsed.data.applicantEmail || null,
        applicant_id_reference: parsed.data.applicantIdReference,
        applicant_address: parsed.data.applicantAddress || null,
        proposed_rent: parsed.data.proposedRent,
        application_date: parsed.data.applicationDate,
        notes: parsed.data.notes || null,
        status: "pending",
        created_by: context.userId,
        updated_by: context.userId,
      })
      .select("id")
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? SAVE_ERROR);
    }

    return z.uuid().parse(data.id);
  });

  if (!result.ok) {
    return { error: result.error };
  }

  revalidatePath("/dashboard/applications");
  redirect(`/dashboard/applications/${result.value}`);
}

export async function reviewApplicationAction(
  applicationId: string,
  _previousState: TenancyFormState,
  formData: FormData,
): Promise<TenancyFormState> {
  if (!validId(applicationId)) {
    return { error: "Invalid application record." };
  }

  const parsed = applicationReviewInputSchema.safeParse({
    status: formText(formData, "status"),
    decisionNotes: formText(formData, "decisionNotes"),
  });
  if (!parsed.success) {
    return formStateFromZod(parsed.error);
  }

  const result = await runMutation("tenants", "approve", async (_context, supabase) => {
    const { data, error } = await supabase.rpc("review_rental_application", {
      p_application_id: applicationId,
      p_status: parsed.data.status,
      p_decision_notes: parsed.data.decisionNotes || null,
    });

    if (error || !data) {
      throw new Error(error?.message ?? SAVE_ERROR);
    }

    return z.uuid().parse(data);
  });

  if (!result.ok) {
    return { error: result.error };
  }

  revalidatePath("/dashboard/applications");
  revalidatePath(`/dashboard/applications/${applicationId}`);
  revalidatePath("/dashboard/tenants");
  revalidatePath("/dashboard/leases");

  return {
    success:
      parsed.data.status === "approved"
        ? "Application approved. Create a lease as the next step; no lease was created automatically."
        : "Application decision saved.",
  };
}

export async function createLeaseAction(
  _previousState: TenancyFormState,
  formData: FormData,
): Promise<TenancyFormState> {
  const parsed = leaseInputSchema.safeParse(leaseFormValues(formData));
  if (!parsed.success) {
    return formStateFromZod(parsed.error);
  }

  const result = await runMutation("leases", "create", async (_context, supabase) => {
    const { data, error } = await supabase.rpc("create_lease", {
      p_tenant_id: parsed.data.tenantId,
      p_unit_id: parsed.data.unitId,
      p_start_date: parsed.data.startDate,
      p_end_date: parsed.data.endDate,
      p_monthly_rent: parsed.data.monthlyRent,
      p_security_deposit_required: parsed.data.securityDepositRequired,
      p_rent_due_day: parsed.data.rentDueDay,
      p_status: parsed.data.status,
      p_special_terms: parsed.data.specialTerms || null,
      p_notes: parsed.data.notes || null,
      p_source_application_id: parsed.data.sourceApplicationId,
      p_renewal_of: parsed.data.renewalOf,
    });

    if (error || !data) {
      throw new Error(error?.message ?? SAVE_ERROR);
    }

    return z.uuid().parse(data);
  });

  if (!result.ok) {
    return { error: result.error };
  }

  revalidatePath("/dashboard/leases");
  revalidatePath("/dashboard/tenants");
  revalidatePath("/dashboard/properties");
  revalidatePath("/dashboard/applications");
  redirect(`/dashboard/leases/${result.value}`);
}

export async function updateLeaseAction(
  leaseId: string,
  _previousState: TenancyFormState,
  formData: FormData,
): Promise<TenancyFormState> {
  if (!validId(leaseId)) {
    return { error: "Invalid lease record." };
  }

  const parsed = leaseInputSchema.safeParse(leaseFormValues(formData));
  if (!parsed.success) {
    return formStateFromZod(parsed.error);
  }

  const result = await runMutation("leases", "edit", async (_context, supabase) => {
    const { data, error } = await supabase.rpc("update_lease", {
      p_lease_id: leaseId,
      p_tenant_id: parsed.data.tenantId,
      p_unit_id: parsed.data.unitId,
      p_start_date: parsed.data.startDate,
      p_end_date: parsed.data.endDate,
      p_monthly_rent: parsed.data.monthlyRent,
      p_security_deposit_required: parsed.data.securityDepositRequired,
      p_rent_due_day: parsed.data.rentDueDay,
      p_status: parsed.data.status,
      p_special_terms: parsed.data.specialTerms || null,
      p_notes: parsed.data.notes || null,
      p_terminated_on: parsed.data.terminatedOn,
      p_termination_reason: parsed.data.terminationReason || null,
    });

    if (error || !data) {
      throw new Error(error?.message ?? SAVE_ERROR);
    }

    return z.uuid().parse(data);
  });

  if (!result.ok) {
    return { error: result.error };
  }

  revalidatePath("/dashboard/leases");
  revalidatePath(`/dashboard/leases/${leaseId}`);
  revalidatePath("/dashboard/tenants");
  revalidatePath("/dashboard/properties");
  redirect(`/dashboard/leases/${leaseId}`);
}
