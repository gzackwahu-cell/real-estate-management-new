import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getRoleNames } from "./role-lookup";
import {
  hasAnyRole,
  ROLES,
  STAFF_ROLES,
  type ActionName,
  type ModuleName,
  type RoleName,
} from "./roles";

export type AuthContext = {
  userId: string;
  email: string | null;
  roles: string[];
  isSuperAdmin: boolean;
};

const authorizedContextBrand: unique symbol = Symbol("AuthorizedContext");

/** Only DAL functions can produce this type. */
export type AuthorizedContext = AuthContext & {
  readonly [authorizedContextBrand]: true;
};

function asAuthorized(context: AuthContext): AuthorizedContext {
  return context as AuthorizedContext;
}

const claimsSchema = z.object({
  sub: z.string().min(1),
  email: z.string().email().optional().nullable(),
});

async function loadAuthContext(): Promise<AuthContext | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error) {
    return null;
  }

  const claims = claimsSchema.safeParse(data?.claims);
  if (!claims.success) {
    return null;
  }

  // A valid JWT is not enough: the profile must still be active.
  const { data: isActive, error: activeError } = await supabase.rpc(
    "is_profile_active",
  );
  if (activeError || isActive !== true) {
    return null;
  }

  const roles = await getRoleNames(supabase);

  return {
    userId: claims.data.sub,
    email: claims.data.email ?? null,
    roles,
    isSuperAdmin: roles.includes(ROLES.SUPER_ADMIN),
  };
}

/** Verified session, active profile and Danwell roles, memoized per render. */
export const getCurrentAuthContext = cache(loadAuthContext);

/** Session check without redirect; used by API guards. */
export async function requireUserOrNull(): Promise<AuthorizedContext | null> {
  const context = await getCurrentAuthContext();
  return context ? asAuthorized(context) : null;
}

export async function requireUser(): Promise<AuthorizedContext> {
  const context = await requireUserOrNull();
  if (!context) {
    redirect("/login");
  }
  return context;
}

export async function requireRoles(
  ...allowedRoles: RoleName[]
): Promise<AuthorizedContext> {
  const context = await requireUser();
  if (!hasAnyRole(context.roles, allowedRoles)) {
    redirect("/dashboard");
  }
  return context;
}

export async function requireStaff(): Promise<AuthorizedContext> {
  return requireRoles(...STAFF_ROLES);
}

export async function isSuperAdmin(): Promise<boolean> {
  return (await getCurrentAuthContext())?.isSuperAdmin ?? false;
}

/**
 * Server-side permission check. Super Admin is always allowed; everyone else
 * is checked by the database function that RLS also uses. The database
 * function also rejects inactive profiles.
 */
export async function hasPermission(
  module: ModuleName,
  action: ActionName,
): Promise<boolean> {
  const context = await getCurrentAuthContext();
  if (!context) {
    return false;
  }
  if (context.isSuperAdmin) {
    return true;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("has_permission", {
    p_module: module,
    p_action: action,
  });

  return !error && data === true;
}

export async function requirePermission(
  module: ModuleName,
  action: ActionName,
): Promise<AuthorizedContext> {
  const context = await requireUser();
  if (!(await hasPermission(module, action))) {
    redirect("/dashboard");
  }
  return context;
}
