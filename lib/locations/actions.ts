"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { withPermission } from "@/lib/auth/guards";

export type LocationActionState = {
  ok: boolean;
  message?: string;
  error?: string;
};

const uuidSchema = z.uuid("Invalid identifier.");
const nameSchema = z
  .string()
  .trim()
  .min(2, "Name must be at least 2 characters.")
  .max(120, "Name is too long.");

function success(message: string): LocationActionState {
  return { ok: true, message };
}

function failure(error: string): LocationActionState {
  return { ok: false, error };
}

function revalidateLocations() {
  revalidatePath("/dashboard/locations");
  revalidatePath("/properties/rent");
  revalidatePath("/properties/sale");
}

function isForeignKeyViolation(error: { code?: string; message?: string }) {
  return error.code === "23503" || error.message?.includes("foreign key");
}

export async function createArea(
  countyId: string,
  name: string,
): Promise<LocationActionState> {
  const parsedCountyId = uuidSchema.safeParse(countyId);
  const parsedName = nameSchema.safeParse(name);
  if (!parsedCountyId.success) return failure("Invalid county.");
  if (!parsedName.success) return failure(parsedName.error.issues[0]?.message ?? "Invalid area name.");

  return withPermission("settings", "create", async (_context, supabase) => {
    const { data: county, error: countyError } = await supabase
      .from("counties")
      .select("id, name, is_active")
      .eq("id", parsedCountyId.data)
      .maybeSingle();

    if (countyError || !county) {
      return failure("County not found.");
    }
    if (!county.is_active) {
      return failure("Areas cannot be added to an inactive county.");
    }

    const { data, error } = await supabase
      .from("areas")
      .insert({
        county_id: parsedCountyId.data,
        name: parsedName.data,
        is_active: true,
      })
      .select("id")
      .maybeSingle();

    if (error) {
      if (error.code === "23505") {
        return failure(`An area named "${parsedName.data}" already exists in ${county.name}.`);
      }
      return failure("Unable to create area.");
    }
    if (!data) {
      return failure("Unable to create area.");
    }

    revalidateLocations();
    return success(`Added ${parsedName.data} to ${county.name}.`);
  });
}

export async function toggleAreaActive(
  areaId: string,
  isActive: boolean,
): Promise<LocationActionState> {
  const parsedAreaId = uuidSchema.safeParse(areaId);
  if (!parsedAreaId.success) return failure("Invalid area.");

  return withPermission("settings", "edit", async (_context, supabase) => {
    const { data: area, error: areaError } = await supabase
      .from("areas")
      .select("id, name, is_active")
      .eq("id", parsedAreaId.data)
      .maybeSingle();

    if (areaError || !area) {
      return failure("Area not found.");
    }
    if (area.is_active === isActive) {
      return success(isActive ? "Area is already active." : "Area is already inactive.");
    }

    const { data, error } = await supabase
      .from("areas")
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq("id", parsedAreaId.data)
      .select("id")
      .maybeSingle();

    if (error || !data) {
      return failure("Unable to update area status.");
    }

    revalidateLocations();
    return success(isActive ? `${area.name} is now active.` : `${area.name} is now inactive.`);
  });
}

export async function deleteArea(areaId: string): Promise<LocationActionState> {
  const parsedAreaId = uuidSchema.safeParse(areaId);
  if (!parsedAreaId.success) return failure("Invalid area.");

  return withPermission("settings", "delete", async (_context, supabase) => {
    const { data: area, error: areaError } = await supabase
      .from("areas")
      .select("id, name")
      .eq("id", parsedAreaId.data)
      .maybeSingle();

    if (areaError || !area) {
      return failure("Area not found.");
    }

    const { data, error } = await supabase
      .from("areas")
      .delete()
      .eq("id", parsedAreaId.data)
      .select("id")
      .maybeSingle();

    if (error) {
      if (isForeignKeyViolation(error)) {
        return failure(
          `${area.name} cannot be deleted because it is referenced by existing records. Deactivate it instead.`,
        );
      }
      return failure("Unable to delete area.");
    }
    if (!data) {
      return failure("Area was not deleted.");
    }

    revalidateLocations();
    return success(`Deleted ${area.name}.`);
  });
}

export async function addCounty(name: string): Promise<LocationActionState> {
  const parsedName = nameSchema.safeParse(name);
  if (!parsedName.success) return failure(parsedName.error.issues[0]?.message ?? "Invalid county name.");

  return withPermission("settings", "create", async (context, supabase) => {
    if (!context.isSuperAdmin) {
      return failure("Only a Super Admin can add counties.");
    }

    const { data, error } = await supabase
      .from("counties")
      .insert({ name: parsedName.data, is_active: true })
      .select("id")
      .maybeSingle();

    if (error) {
      if (error.code === "23505") {
        return failure(`County "${parsedName.data}" already exists.`);
      }
      return failure("Unable to add county.");
    }
    if (!data) {
      return failure("Unable to add county.");
    }

    revalidateLocations();
    return success(`Added county ${parsedName.data}.`);
  });
}
