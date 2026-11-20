import "server-only";

import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { requireRoles, requireUser } from "@/lib/auth/dal";
import {
  hasAnyRole,
  ROLES,
  STAFF_ROLES,
  type RoleName,
} from "@/lib/auth/roles";

export async function RequireUser({ children }: { children: ReactNode }) {
  await requireUser();
  return children;
}

export async function RequireRoles({
  roles,
  children,
}: {
  roles: RoleName[];
  children: ReactNode;
}) {
  await requireRoles(...roles);
  return children;
}

/** Keeps the staff dashboard separate from the tenant and owner portals. */
export async function DashboardAccess({ children }: { children: ReactNode }) {
  const context = await requireUser();

  if (hasAnyRole(context.roles, STAFF_ROLES)) {
    return children;
  }

  if (context.roles.includes(ROLES.TENANT)) {
    redirect("/tenant");
  }
  if (context.roles.includes(ROLES.OWNER)) {
    redirect("/owner");
  }

  // Default-deny: an authenticated user with no explicitly authorized role
  // must not see the staff dashboard.
  notFound();
}
