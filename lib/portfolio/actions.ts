"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { AuthorizedContext } from "@/lib/auth/dal";
import { withPermission } from "@/lib/auth/guards";
import type { PortfolioClient } from "./queries";
import {
  bulkUnitInputSchema,
  formStateFromZod,
  formText,
  ownerInputSchema,
  propertyInputSchema,
  readOwnerAssignments,
  unitInputSchema,
  type PortfolioFormState,
  type PropertyOwnerInput,
} from "./validation";

type MutationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

type MutationHandler<T> = (
  context: AuthorizedContext,
  supabase: PortfolioClient,
) => Promise<T>;

const SAVE_ERROR =
  "The change could not be saved. Check the details and try again.";

function safeMutationError(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  const allowedMessages = [
    "Select at least one owner.",
    "Choose exactly one primary owner.",
    "Verified owners require an ownership percentage.",
    "One or more selected owners are unavailable.",
    "Verified ownership percentages for a property must total 100.",
  ];

  if (allowedMessages.some((allowed) => message.includes(allowed))) {
    return message;
  }
  if (message.includes("owners_id_reference_key")) {
    return "That ID or reference number is already registered.";
  }
  if (message.includes("units_property_number_key")) {
    return "A unit with that number already exists on this property.";
  }

  return SAVE_ERROR;
}

async function runMutation<T>(
  module: "owners" | "properties" | "units",
  action: "view" | "create" | "edit" | "delete",
  handler: MutationHandler<T>,
): Promise<MutationResult<T>> {
  let result: MutationResult<T> | undefined;

  // withPermission may redirect. It is intentionally outside the try/catch so
  // the framework redirect is never swallowed as a form error.
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

function ownerFormValues(formData: FormData) {
  return {
    fullName: formText(formData, "fullName"),
    phone: formText(formData, "phone"),
    email: formText(formData, "email"),
    idReference: formText(formData, "idReference"),
    address: formText(formData, "address"),
    isActive: formData.get("isActive") === "on",
  };
}

function propertyFormValues(formData: FormData) {
  return {
    title: formText(formData, "title"),
    description: formText(formData, "description"),
    propertyType: formText(formData, "propertyType"),
    county: formText(formData, "county"),
    town: formText(formData, "town"),
    estate: formText(formData, "estate"),
    physicalAddress: formText(formData, "physicalAddress"),
    directions: formText(formData, "directions"),
    status: formText(formData, "status"),
    owners: readOwnerAssignments(formData),
  };
}

function unitFormValues(formData: FormData) {
  return {
    unitNumber: formText(formData, "unitNumber"),
    unitType: formText(formData, "unitType"),
    floor: formText(formData, "floor"),
    bedrooms: formText(formData, "bedrooms"),
    bathrooms: formText(formData, "bathrooms"),
    areaSqm: formText(formData, "areaSqm"),
    monthlyRent: formText(formData, "monthlyRent"),
    depositAmount: formText(formData, "depositAmount"),
    rentPeriod: formText(formData, "rentPeriod") || "monthly",
    depositRequired: formData.get("depositRequired") === "on",
    occupancyStatus: formText(formData, "occupancyStatus"),
    isActive: formData.get("isActive") === "on",
    isListable: formData.get("isListable") === "on",
    sortOrder: formText(formData, "sortOrder"),
    amenities: formText(formData, "amenities"),
    publicNotes: formText(formData, "publicNotes"),
    notes: formText(formData, "notes"),
  };
}

function bulkUnitFormValues(formData: FormData) {
  return {
    prefix: formText(formData, "prefix"),
    startNumber: formText(formData, "startNumber"),
    count: formText(formData, "count"),
    floor: formText(formData, "floor"),
    unitType: formText(formData, "unitType"),
    bedrooms: formText(formData, "bedrooms"),
    bathrooms: formText(formData, "bathrooms"),
    areaSqm: formText(formData, "areaSqm"),
    monthlyRent: formText(formData, "monthlyRent"),
    depositAmount: formText(formData, "depositAmount"),
    rentPeriod: formText(formData, "rentPeriod") || "monthly",
    depositRequired: formData.get("depositRequired") === "on",
    occupancyStatus: formText(formData, "occupancyStatus") || "vacant",
    isActive: formData.get("isActive") === "on",
    isListable: formData.get("isListable") === "on",
    amenities: formText(formData, "amenities"),
    publicNotes: formText(formData, "publicNotes"),
    notes: formText(formData, "notes"),
  };
}

function rpcOwners(owners: PropertyOwnerInput[]) {
  return owners.map((owner) => ({
    ownerId: owner.ownerId,
    percentage: owner.percentage === null ? null : String(owner.percentage),
    verificationStatus: owner.verificationStatus,
    isPrimary: owner.isPrimary,
  }));
}

export async function createOwnerAction(
  _previousState: PortfolioFormState,
  formData: FormData,
): Promise<PortfolioFormState> {
  const parsed = ownerInputSchema.safeParse(ownerFormValues(formData));
  if (!parsed.success) {
    return formStateFromZod(parsed.error);
  }

  const result = await runMutation("owners", "create", async (context, supabase) => {
    const { data, error } = await supabase
      .from("owners")
      .insert({
        full_name: parsed.data.fullName,
        phone: parsed.data.phone,
        email: parsed.data.email || null,
        id_reference: parsed.data.idReference,
        address: parsed.data.address,
        is_active: parsed.data.isActive,
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

  revalidatePath("/dashboard/owners");
  redirect(`/dashboard/owners/${result.value}`);
}

export async function updateOwnerAction(
  ownerId: string,
  _previousState: PortfolioFormState,
  formData: FormData,
): Promise<PortfolioFormState> {
  if (!validId(ownerId)) {
    return { error: "Invalid owner record." };
  }

  const parsed = ownerInputSchema.safeParse(ownerFormValues(formData));
  if (!parsed.success) {
    return formStateFromZod(parsed.error);
  }

  const result = await runMutation("owners", "edit", async (context, supabase) => {
    const { error } = await supabase
      .from("owners")
      .update({
        full_name: parsed.data.fullName,
        phone: parsed.data.phone,
        email: parsed.data.email || null,
        id_reference: parsed.data.idReference,
        address: parsed.data.address,
        is_active: parsed.data.isActive,
        updated_by: context.userId,
      })
      .eq("id", ownerId);

    if (error) {
      throw new Error(error.message);
    }

    return ownerId;
  });

  if (!result.ok) {
    return { error: result.error };
  }

  revalidatePath("/dashboard/owners");
  revalidatePath(`/dashboard/owners/${ownerId}`);
  redirect(`/dashboard/owners/${ownerId}`);
}

export async function setOwnerActiveAction(
  ownerId: string,
  isActive: boolean,
): Promise<void> {
  if (!validId(ownerId)) {
    throw new Error("Invalid owner record.");
  }

  const result = await runMutation("owners", "edit", async (context, supabase) => {
    const { error } = await supabase
      .from("owners")
      .update({ is_active: isActive, updated_by: context.userId })
      .eq("id", ownerId);

    if (error) {
      throw new Error(error.message);
    }

    return ownerId;
  });

  if (!result.ok) {
    throw new Error(result.error);
  }

  revalidatePath("/dashboard/owners");
  revalidatePath(`/dashboard/owners/${ownerId}`);
}

export async function createPropertyAction(
  _previousState: PortfolioFormState,
  formData: FormData,
): Promise<PortfolioFormState> {
  const parsed = propertyInputSchema.safeParse(propertyFormValues(formData));
  if (!parsed.success) {
    return formStateFromZod(parsed.error);
  }

  const result = await runMutation(
    "properties",
    "create",
    async (_context, supabase) => {
      const { data, error } = await supabase.rpc("create_property_with_owners", {
        p_title: parsed.data.title,
        p_description: parsed.data.description,
        p_property_type: parsed.data.propertyType,
        p_county: parsed.data.county,
        p_town: parsed.data.town,
        p_estate: parsed.data.estate,
        p_physical_address: parsed.data.physicalAddress,
        p_directions: parsed.data.directions,
        p_status: parsed.data.status,
        p_owners: rpcOwners(parsed.data.owners),
      });

      if (error || !data) {
        throw new Error(error?.message ?? SAVE_ERROR);
      }

      return z.uuid().parse(data);
    },
  );

  if (!result.ok) {
    return { error: result.error };
  }

  revalidatePath("/dashboard/properties");
  redirect(`/dashboard/properties/${result.value}`);
}

export async function updatePropertyAction(
  propertyId: string,
  _previousState: PortfolioFormState,
  formData: FormData,
): Promise<PortfolioFormState> {
  if (!validId(propertyId)) {
    return { error: "Invalid property record." };
  }

  const parsed = propertyInputSchema.safeParse(propertyFormValues(formData));
  if (!parsed.success) {
    return formStateFromZod(parsed.error);
  }

  const result = await runMutation(
    "properties",
    "edit",
    async (_context, supabase) => {
      const { data, error } = await supabase.rpc("update_property_with_owners", {
        p_property_id: propertyId,
        p_title: parsed.data.title,
        p_description: parsed.data.description,
        p_property_type: parsed.data.propertyType,
        p_county: parsed.data.county,
        p_town: parsed.data.town,
        p_estate: parsed.data.estate,
        p_physical_address: parsed.data.physicalAddress,
        p_directions: parsed.data.directions,
        p_status: parsed.data.status,
        p_owners: rpcOwners(parsed.data.owners),
      });

      if (error || !data) {
        throw new Error(error?.message ?? SAVE_ERROR);
      }

      return z.uuid().parse(data);
    },
  );

  if (!result.ok) {
    return { error: result.error };
  }

  revalidatePath("/dashboard/properties");
  revalidatePath(`/dashboard/properties/${propertyId}`);
  redirect(`/dashboard/properties/${propertyId}`);
}

function unitDbPayload(
  propertyId: string,
  data: z.infer<typeof unitInputSchema>,
  userId: string,
  mode: "create" | "update",
) {
  const base = {
    property_id: propertyId,
    unit_number: data.unitNumber,
    unit_type: data.unitType,
    floor: data.floor || null,
    bedrooms: data.bedrooms,
    bathrooms: data.bathrooms,
    area_sqm: data.areaSqm,
    monthly_rent: data.monthlyRent,
    deposit_amount: data.depositAmount,
    rent_period: data.rentPeriod,
    deposit_required: data.depositRequired,
    occupancy_status: data.occupancyStatus,
    is_active: data.isActive,
    is_listable: data.isListable,
    sort_order: data.sortOrder,
    amenities: data.amenities,
    public_notes: data.publicNotes || null,
    notes: data.notes || null,
    updated_by: userId,
  };
  return mode === "create" ? { ...base, created_by: userId } : base;
}

export async function createUnitAction(
  propertyId: string,
  _previousState: PortfolioFormState,
  formData: FormData,
): Promise<PortfolioFormState> {
  if (!validId(propertyId)) {
    return { error: "Invalid property record." };
  }

  const parsed = unitInputSchema.safeParse(unitFormValues(formData));
  if (!parsed.success) {
    return formStateFromZod(parsed.error);
  }

  const result = await runMutation("units", "create", async (context, supabase) => {
    const { error } = await supabase
      .from("units")
      .insert(unitDbPayload(propertyId, parsed.data, context.userId, "create"));

    if (error) {
      throw new Error(error.message);
    }

    return propertyId;
  });

  if (!result.ok) {
    return { error: result.error };
  }

  revalidatePath(`/dashboard/properties/${propertyId}`);
  revalidatePath("/dashboard/units");
  redirect(`/dashboard/properties/${propertyId}?tab=units`);
}

export async function updateUnitAction(
  propertyId: string,
  unitId: string,
  _previousState: PortfolioFormState,
  formData: FormData,
): Promise<PortfolioFormState> {
  if (!validId(propertyId) || !validId(unitId)) {
    return { error: "Invalid unit record." };
  }

  const parsed = unitInputSchema.safeParse(unitFormValues(formData));
  if (!parsed.success) {
    return formStateFromZod(parsed.error);
  }

  const result = await runMutation("units", "edit", async (context, supabase) => {
    const { error } = await supabase
      .from("units")
      .update(unitDbPayload(propertyId, parsed.data, context.userId, "update"))
      .eq("id", unitId)
      .eq("property_id", propertyId);

    if (error) {
      throw new Error(error.message);
    }

    return unitId;
  });

  if (!result.ok) {
    return { error: result.error };
  }

  revalidatePath(`/dashboard/properties/${propertyId}`);
  revalidatePath("/dashboard/units");
  redirect(`/dashboard/properties/${propertyId}?tab=units`);
}

export async function bulkCreateUnitsAction(
  propertyId: string,
  _previousState: PortfolioFormState,
  formData: FormData,
): Promise<PortfolioFormState> {
  if (!validId(propertyId)) {
    return { error: "Invalid property record." };
  }

  const parsed = bulkUnitInputSchema.safeParse(bulkUnitFormValues(formData));
  if (!parsed.success) {
    return formStateFromZod(parsed.error);
  }

  const result = await runMutation("units", "create", async (context, supabase) => {
    const data = parsed.data;
    const rows = Array.from({ length: data.count }, (_, i) => {
      const n = data.startNumber + i;
      const unitNumber = data.prefix ? `${data.prefix}${n}` : String(n);
      return {
        property_id: propertyId,
        unit_number: unitNumber,
        unit_type: data.unitType,
        floor: data.floor || null,
        bedrooms: data.bedrooms,
        bathrooms: data.bathrooms,
        area_sqm: data.areaSqm,
        monthly_rent: data.monthlyRent,
        deposit_amount: data.depositAmount,
        rent_period: data.rentPeriod,
        deposit_required: data.depositRequired,
        occupancy_status: data.occupancyStatus,
        is_active: data.isActive,
        is_listable: data.isListable,
        sort_order: n,
        amenities: data.amenities,
        public_notes: data.publicNotes || null,
        notes: data.notes || null,
        created_by: context.userId,
        updated_by: context.userId,
      };
    });

    const { error } = await supabase.from("units").insert(rows);
    if (error) {
      throw new Error(error.message);
    }
    return rows.length;
  });

  if (!result.ok) {
    return { error: result.error };
  }

  revalidatePath(`/dashboard/properties/${propertyId}`);
  revalidatePath("/dashboard/units");
  return { success: `${result.value} unit${result.value === 1 ? "" : "s"} created.` };
}
