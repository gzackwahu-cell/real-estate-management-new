"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { withPermission } from "@/lib/auth/guards";
import { ROLES } from "@/lib/auth/roles";
import { STAFF_WRITES_ENABLED, type StaffActionState } from "@/lib/auth/staff-queries";

const uuidSchema = z.uuid();
const TABLE_WRITE_ERROR =
  "Role and permission changes could not be completed. Check that database grants and RLS policies are applied.";

function success(message: string): StaffActionState {
  return { ok: true, message };
}

function failure(error: string): StaffActionState {
  return { ok: false, error };
}

function refreshStaff(): void {
  revalidatePath("/dashboard/staff");
}

function isSuperAdminOnly(context: { isSuperAdmin: boolean }): StaffActionState | null {
  if (!context.isSuperAdmin) {
    return failure("Only a Super Admin can change users, roles or permissions.");
  }
  return null;
}

export async function setProfileActiveAction(
  profileId: string,
  isActive: boolean,
): Promise<StaffActionState> {
  const parsedId = uuidSchema.safeParse(profileId);
  if (!parsedId.success) {
    return failure("Invalid profile.");
  }

  return withPermission("users_roles", "edit", async (context, supabase) => {
    const denied = isSuperAdminOnly(context);
    if (denied) return denied;

    if (profileId === context.userId && !isActive) {
      return failure("You cannot deactivate your own account.");
    }

    const { error } = await supabase.rpc("set_profile_active", {
      p_profile_id: parsedId.data,
      p_is_active: isActive,
    });

    if (error) {
      return failure(
        "Unable to change profile activation. The database may be protecting the last Super Admin.",
      );
    }

    refreshStaff();
    return success(isActive ? "Profile activated." : "Profile deactivated.");
  });
}

export async function assignRoleAction(
  profileId: string,
  roleId: string,
): Promise<StaffActionState> {
  const parsedProfileId = uuidSchema.safeParse(profileId);
  const parsedRoleId = uuidSchema.safeParse(roleId);
  if (!parsedProfileId.success || !parsedRoleId.success) {
    return failure("Invalid profile or role.");
  }

  return withPermission("users_roles", "edit", async (context, supabase) => {
    const denied = isSuperAdminOnly(context);
    if (denied) return denied;
    if (!STAFF_WRITES_ENABLED) return failure(TABLE_WRITE_ERROR);

    const [profileResult, roleResult] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, is_active")
        .eq("id", parsedProfileId.data)
        .maybeSingle(),
      supabase
        .from("roles")
        .select("id, name, is_active")
        .eq("id", parsedRoleId.data)
        .maybeSingle(),
    ]);

    if (profileResult.error || !profileResult.data) {
      return failure("Profile not found.");
    }
    if (roleResult.error || !roleResult.data) {
      return failure("Role not found.");
    }
    if (!roleResult.data.is_active) {
      return failure("Inactive roles cannot be assigned.");
    }
    if (!profileResult.data.is_active) {
      return failure("Reactivate the profile before assigning roles.");
    }

    const existing = await supabase
      .from("profile_roles")
      .select("profile_id, role_id, is_active")
      .eq("profile_id", parsedProfileId.data)
      .eq("role_id", parsedRoleId.data)
      .maybeSingle();

    if (existing.error) {
      return failure("Unable to check existing role assignments.");
    }
    if (existing.data?.is_active) {
      return success("Role is already assigned.");
    }

    const timestamp = new Date().toISOString();
    const result = existing.data
      ? await supabase
          .from("profile_roles")
          .update({
            is_active: true,
            assigned_by: context.userId,
            assigned_at: timestamp,
          })
          .eq("profile_id", parsedProfileId.data)
          .eq("role_id", parsedRoleId.data)
          .select("profile_id")
      : await supabase
          .from("profile_roles")
          .insert({
            profile_id: parsedProfileId.data,
            role_id: parsedRoleId.data,
            assigned_by: context.userId,
            is_active: true,
            assigned_at: timestamp,
          })
          .select("profile_id");

    if (result.error || !result.data || result.data.length === 0) {
      return failure("Unable to assign this role.");
    }

    refreshStaff();
    return success(`Assigned ${roleResult.data.name}.`);
  });
}

export async function deactivateRoleAction(
  profileId: string,
  roleId: string,
): Promise<StaffActionState> {
  const parsedProfileId = uuidSchema.safeParse(profileId);
  const parsedRoleId = uuidSchema.safeParse(roleId);
  if (!parsedProfileId.success || !parsedRoleId.success) {
    return failure("Invalid profile or role.");
  }

  return withPermission("users_roles", "edit", async (context, supabase) => {
    const denied = isSuperAdminOnly(context);
    if (denied) return denied;
    if (!STAFF_WRITES_ENABLED) return failure(TABLE_WRITE_ERROR);

    const { data: role, error: roleError } = await supabase
      .from("roles")
      .select("id, name")
      .eq("id", parsedRoleId.data)
      .maybeSingle();

    if (roleError || !role) {
      return failure("Role not found.");
    }
    if (role.name === ROLES.SUPER_ADMIN && profileId === context.userId) {
      return failure("You cannot remove your own Super Admin role.");
    }

    const { data, error } = await supabase
      .from("profile_roles")
      .update({ is_active: false })
      .eq("profile_id", parsedProfileId.data)
      .eq("role_id", parsedRoleId.data)
      .eq("is_active", true)
      .select("profile_id");

    if (error) {
      return failure(
        role.name === ROLES.SUPER_ADMIN
          ? "Unable to remove this role. The database may be protecting the last Super Admin."
          : "Unable to remove this role.",
      );
    }
    if (!data || data.length === 0) {
      return success("Role was already inactive.");
    }

    refreshStaff();
    return success(`Removed ${role.name}.`);
  });
}

export async function grantPermissionAction(
  roleId: string,
  permissionId: string,
): Promise<StaffActionState> {
  const parsedRoleId = uuidSchema.safeParse(roleId);
  const parsedPermissionId = uuidSchema.safeParse(permissionId);
  if (!parsedRoleId.success || !parsedPermissionId.success) {
    return failure("Invalid role or permission.");
  }

  return withPermission("users_roles", "edit", async (context, supabase) => {
    const denied = isSuperAdminOnly(context);
    if (denied) return denied;
    if (!STAFF_WRITES_ENABLED) return failure(TABLE_WRITE_ERROR);

    const [roleResult, permissionResult] = await Promise.all([
      supabase
        .from("roles")
        .select("id, name, is_active")
        .eq("id", parsedRoleId.data)
        .maybeSingle(),
      supabase
        .from("permissions")
        .select("id, module, action")
        .eq("id", parsedPermissionId.data)
        .maybeSingle(),
    ]);

    if (roleResult.error || !roleResult.data) {
      return failure("Role not found.");
    }
    if (permissionResult.error || !permissionResult.data) {
      return failure("Permission not found.");
    }
    if (roleResult.data.name === ROLES.SUPER_ADMIN) {
      return failure("Super Admin already has every permission.");
    }
    if (!roleResult.data.is_active) {
      return failure("Inactive roles cannot be changed.");
    }

    const existing = await supabase
      .from("role_permissions")
      .select("role_id, permission_id")
      .eq("role_id", parsedRoleId.data)
      .eq("permission_id", parsedPermissionId.data)
      .maybeSingle();

    if (existing.error) {
      return failure("Unable to check existing permission grants.");
    }
    if (existing.data) {
      return success("Permission is already granted.");
    }

    const { error } = await supabase.from("role_permissions").insert({
      role_id: parsedRoleId.data,
      permission_id: parsedPermissionId.data,
    });

    if (error) {
      return failure("Unable to grant this permission.");
    }

    refreshStaff();
    return success(
      `Granted ${permissionResult.data.module}:${permissionResult.data.action}.`,
    );
  });
}

export async function revokePermissionAction(
  roleId: string,
  permissionId: string,
): Promise<StaffActionState> {
  const parsedRoleId = uuidSchema.safeParse(roleId);
  const parsedPermissionId = uuidSchema.safeParse(permissionId);
  if (!parsedRoleId.success || !parsedPermissionId.success) {
    return failure("Invalid role or permission.");
  }

  return withPermission("users_roles", "edit", async (context, supabase) => {
    const denied = isSuperAdminOnly(context);
    if (denied) return denied;
    if (!STAFF_WRITES_ENABLED) return failure(TABLE_WRITE_ERROR);

    const [roleResult, permissionResult] = await Promise.all([
      supabase
        .from("roles")
        .select("id, name, is_active")
        .eq("id", parsedRoleId.data)
        .maybeSingle(),
      supabase
        .from("permissions")
        .select("id, module, action")
        .eq("id", parsedPermissionId.data)
        .maybeSingle(),
    ]);

    if (roleResult.error || !roleResult.data) {
      return failure("Role not found.");
    }
    if (permissionResult.error || !permissionResult.data) {
      return failure("Permission not found.");
    }
    if (roleResult.data.name === ROLES.SUPER_ADMIN) {
      return failure("Super Admin permissions cannot be revoked.");
    }
    if (!roleResult.data.is_active) {
      return failure("Inactive roles cannot be changed.");
    }

    const { data, error } = await supabase
      .from("role_permissions")
      .delete()
      .eq("role_id", parsedRoleId.data)
      .eq("permission_id", parsedPermissionId.data)
      .select("role_id");

    if (error) {
      return failure("Unable to revoke this permission.");
    }
    if (!data || data.length === 0) {
      return success("Permission was already revoked.");
    }

    refreshStaff();
    return success(
      `Revoked ${permissionResult.data.module}:${permissionResult.data.action}.`,
    );
  });
}
