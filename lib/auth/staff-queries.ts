import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { ACTIONS, MODULES, ROLES } from "./roles";

/**
 * Verified against production on 2026-11-23 with a read-only schema query:
 * authenticated has SELECT-only ACLs on roles, permissions, role_permissions
 * and profile_roles (`authenticated=r/postgres`). RLS policies already allow
 * Super Admin writes, but the table-level grants are missing, so role and
 * permission mutations must stay read-only until those grants are applied.
 *
 * Profile activation is deliberately separate: `set_profile_active(uuid,
 * boolean)` is granted to authenticated and enforces Super Admin in SQL.
 */
export const STAFF_WRITES_ENABLED = true;

export type StaffActionState = {
  ok?: boolean;
  error?: string;
  message?: string;
};

export type StaffProfile = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt: string | null;
};

export type StaffRole = {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  isActive: boolean;
};

export type StaffPermission = {
  id: string;
  module: string;
  action: string;
  description: string | null;
};

export type StaffAssignment = {
  profileId: string;
  roleId: string;
  isActive: boolean;
  assignedAt: string | null;
  assignedBy: string | null;
};

export type StaffPermissionGrant = {
  roleId: string;
  permissionId: string;
};

export type StaffMatrixCell = {
  granted: number;
  total: number;
  permissionIds: Record<string, string>;
};

export type StaffAccessSnapshot = {
  profiles: StaffProfile[];
  roles: StaffRole[];
  permissions: StaffPermission[];
  assignments: StaffAssignment[];
  grants: StaffPermissionGrant[];
  modules: string[];
  actions: string[];
  matrix: Record<string, Record<string, StaffMatrixCell>>;
  stats: {
    profiles: number;
    activeProfiles: number;
    activeRoles: number;
    activeAssignments: number;
    grants: number;
  };
};

const profileRowSchema = z.object({
  id: z.uuid(),
  full_name: z.string(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  is_active: z.boolean(),
  created_at: z.string().nullable().optional(),
});

const roleRowSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  description: z.string().nullable().optional(),
  is_system: z.boolean(),
  is_active: z.boolean(),
});

const permissionRowSchema = z.object({
  id: z.uuid(),
  module: z.string(),
  action: z.string(),
  description: z.string().nullable().optional(),
});

const assignmentRowSchema = z.object({
  profile_id: z.uuid(),
  role_id: z.uuid(),
  is_active: z.boolean(),
  assigned_at: z.string().nullable().optional(),
  assigned_by: z.uuid().nullable().optional(),
});

const grantRowSchema = z.object({
  role_id: z.uuid(),
  permission_id: z.uuid(),
});

function fail(message: string): never {
  throw new Error(message);
}

function orderValues(
  values: readonly string[],
  preferred: readonly string[],
): string[] {
  const present = new Set(values);
  const known = preferred.filter((value) => present.has(value));
  const extra = [...present].filter((value) => !preferred.includes(value)).sort();
  return [...known, ...extra];
}

export async function getStaffProfiles(
  supabase: SupabaseClient,
): Promise<StaffProfile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone, is_active, created_at")
    .order("full_name", { ascending: true });

  if (error) {
    fail("Unable to load staff profiles.");
  }

  return z.array(profileRowSchema).parse(data ?? []).map((row) => ({
    id: row.id,
    fullName: row.full_name,
    email: row.email ?? null,
    phone: row.phone ?? null,
    isActive: row.is_active,
    createdAt: row.created_at ?? null,
  }));
}

export async function getStaffRoles(
  supabase: SupabaseClient,
): Promise<StaffRole[]> {
  const { data, error } = await supabase
    .from("roles")
    .select("id, name, description, is_system, is_active")
    .order("name", { ascending: true });

  if (error) {
    fail("Unable to load roles.");
  }

  const roles = z.array(roleRowSchema).parse(data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    isSystem: row.is_system,
    isActive: row.is_active,
  }));

  return roles.sort((left, right) => {
    if (left.name === ROLES.SUPER_ADMIN) return -1;
    if (right.name === ROLES.SUPER_ADMIN) return 1;
    return left.name.localeCompare(right.name);
  });
}

export async function getPermissionCatalog(
  supabase: SupabaseClient,
): Promise<StaffPermission[]> {
  const { data, error } = await supabase
    .from("permissions")
    .select("id, module, action, description")
    .order("module", { ascending: true })
    .order("action", { ascending: true });

  if (error) {
    fail("Unable to load permissions.");
  }

  return z.array(permissionRowSchema).parse(data ?? []).map((row) => ({
    id: row.id,
    module: row.module,
    action: row.action,
    description: row.description ?? null,
  }));
}

export async function getRoleAssignments(
  supabase: SupabaseClient,
): Promise<StaffAssignment[]> {
  const { data, error } = await supabase
    .from("profile_roles")
    .select("profile_id, role_id, is_active, assigned_at, assigned_by")
    .order("assigned_at", { ascending: false });

  if (error) {
    fail("Unable to load role assignments.");
  }

  return z.array(assignmentRowSchema).parse(data ?? []).map((row) => ({
    profileId: row.profile_id,
    roleId: row.role_id,
    isActive: row.is_active,
    assignedAt: row.assigned_at ?? null,
    assignedBy: row.assigned_by ?? null,
  }));
}

export async function getRolePermissionGrants(
  supabase: SupabaseClient,
): Promise<StaffPermissionGrant[]> {
  const { data, error } = await supabase
    .from("role_permissions")
    .select("role_id, permission_id");

  if (error) {
    fail("Unable to load role permissions.");
  }

  return z.array(grantRowSchema).parse(data ?? []).map((row) => ({
    roleId: row.role_id,
    permissionId: row.permission_id,
  }));
}

export async function getStaffAccessSnapshot(
  supabase: SupabaseClient,
): Promise<StaffAccessSnapshot> {
  const [profiles, roles, permissions, assignments, grants] = await Promise.all([
    getStaffProfiles(supabase),
    getStaffRoles(supabase),
    getPermissionCatalog(supabase),
    getRoleAssignments(supabase),
    getRolePermissionGrants(supabase),
  ]);

  const modules = orderValues(
    permissions.map((permission) => permission.module),
    MODULES,
  );
  const actions = orderValues(
    permissions.map((permission) => permission.action),
    ACTIONS,
  );
  const permissionById = new Map(
    permissions.map((permission) => [permission.id, permission]),
  );
  const matrix: Record<string, Record<string, StaffMatrixCell>> = {};

  for (const role of roles) {
    matrix[role.id] = {};
    for (const moduleName of modules) {
      matrix[role.id][moduleName] = { granted: 0, total: 0, permissionIds: {} };
    }
  }

  for (const permission of permissions) {
    for (const role of roles) {
      const cell = matrix[role.id][permission.module];
      if (!cell) continue;
      cell.total += 1;
      cell.permissionIds[permission.action] = permission.id;
    }
  }

  for (const grant of grants) {
    const permission = permissionById.get(grant.permissionId);
    const row = permission ? matrix[grant.roleId] : undefined;
    const cell = permission ? row?.[permission.module] : undefined;
    if (cell && permission) {
      cell.granted += 1;
    }
  }

  return {
    profiles,
    roles,
    permissions,
    assignments,
    grants,
    modules,
    actions,
    matrix,
    stats: {
      profiles: profiles.length,
      activeProfiles: profiles.filter((profile) => profile.isActive).length,
      activeRoles: roles.filter((role) => role.isActive).length,
      activeAssignments: assignments.filter((assignment) => assignment.isActive).length,
      grants: grants.length,
    },
  };
}
