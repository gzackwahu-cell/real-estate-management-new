export const ROLES = {
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin",
  FINANCE: "finance",
  PROPERTY_MANAGER: "property_manager",
  CARETAKER: "caretaker",
  FIELD_AGENT: "field_agent",
  TENANT: "tenant",
  OWNER: "owner",
} as const;

export type RoleName = (typeof ROLES)[keyof typeof ROLES];

export const MODULES = [
  "properties",
  "units",
  "owners",
  "tenants",
  "leases",
  "rent",
  "payments",
  "deposits",
  "expenses",
  "maintenance",
  "listings",
  "inquiries",
  "viewings",
  "website_content",
  "users_roles",
  "reports",
  "settings",
  "notifications",
] as const;

export type ModuleName = (typeof MODULES)[number];

export const ACTIONS = [
  "view",
  "create",
  "edit",
  "delete",
  "approve",
  "export",
  "publish",
] as const;

export type ActionName = (typeof ACTIONS)[number];

export const STAFF_ROLES: readonly RoleName[] = [
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN,
  ROLES.FINANCE,
  ROLES.PROPERTY_MANAGER,
  ROLES.CARETAKER,
  ROLES.FIELD_AGENT,
];

export function hasAnyRole(
  userRoles: readonly string[],
  allowedRoles: readonly RoleName[],
): boolean {
  return userRoles.some((role) => allowedRoles.includes(role as RoleName));
}

/**
 * Chooses a fixed landing route after sign-in. Fixed paths prevent open
 * redirects from untrusted query parameters.
 */
export function landingPathForRoles(userRoles: readonly string[]): string {
  if (hasAnyRole(userRoles, [ROLES.SUPER_ADMIN, ROLES.ADMIN])) {
    return "/dashboard";
  }
  if (userRoles.includes(ROLES.TENANT)) {
    return "/tenant";
  }
  if (userRoles.includes(ROLES.OWNER)) {
    return "/owner";
  }
  if (userRoles.includes(ROLES.FINANCE)) {
    return "/dashboard/finance";
  }
  if (userRoles.includes(ROLES.PROPERTY_MANAGER)) {
    return "/dashboard/properties";
  }
  if (userRoles.includes(ROLES.CARETAKER)) {
    return "/dashboard/maintenance";
  }
  if (userRoles.includes(ROLES.FIELD_AGENT)) {
    return "/dashboard/listings";
  }
  return "/dashboard";
}
