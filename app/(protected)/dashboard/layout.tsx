import { Suspense, type ReactNode } from "react";

export const instant = false;
import {
  AdminChrome,
  type AdminNavGroup,
  type AdminQuickAction,
} from "@/components/admin/admin-chrome";
import { AdminChromeSkeleton } from "@/components/admin/admin-chrome-skeleton";
import { DashboardAccess } from "@/components/auth/protected-guard";
import { LogoutButton } from "@/components/auth/logout-button";
import { hasPermission, requireUser } from "@/lib/auth/dal";
import type { ModuleName } from "@/lib/auth/roles";
// eslint-disable-next-line no-restricted-imports -- layout already enforces requireUser; client is used only for unread notification count.
import { getAuthorizedServerClient } from "@/lib/supabase/server";

async function has(module: ModuleName, action: "view" | "create" = "view") {
  return hasPermission(module, action);
}

async function AdminShell({ children }: { children: ReactNode }) {
  const context = await requireUser();

  const [
    canProperties,
    canCreateProperty,
    canOwners,
    canTenants,
    canCreateTenant,
    canLeases,
    canFinance,
    canMaintenance,
    canListings,
    canCreateListing,
    canInquiries,
    canViewings,
    canReports,
    canUsersRoles,
    canNotifications,
  ] = await Promise.all([
    has("properties"),
    has("properties", "create"),
    has("owners"),
    has("tenants"),
    has("tenants", "create"),
    has("leases"),
    has("rent"),
    has("maintenance"),
    has("listings"),
    has("listings", "create"),
    has("inquiries"),
    has("viewings"),
    has("reports"),
    has("users_roles"),
    has("notifications"),
  ]);

  const notificationCount = await (async () => {
    try {
      const supabase = await getAuthorizedServerClient(context);
      const { count, error } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("recipient_profile_id", context.userId)
        .eq("status", "unread");
      return error ? 0 : (count ?? 0);
    } catch {
      return 0;
    }
  })();

  const groups: AdminNavGroup[] = [
    {
      label: "Overview",
      items: [
        { href: "/dashboard", label: "Dashboard", icon: "dashboard" as const },
      ],
    },
    {
      label: "Properties",
      items: [
        ...(canProperties
          ? [{ href: "/dashboard/properties", label: "All Properties", icon: "properties" as const }]
          : []),
        ...(canProperties
          ? [{ href: "/dashboard/units", label: "Units", icon: "properties" as const }]
          : []),
        ...(canListings || canProperties
          ? [{ href: "/dashboard/categories", label: "Property Categories", icon: "listings" as const }]
          : []),
        ...(canUsersRoles || canProperties
          ? [{ href: "/dashboard/locations", label: "Locations", icon: "land" as const }]
          : []),
      ],
    },
    {
      label: "Tenancy",
      items: [
        ...(canTenants
          ? [{ href: "/dashboard/tenants", label: "Tenants", icon: "tenants" as const }]
          : []),
        ...(canTenants || canProperties
          ? [{ href: "/dashboard/applications", label: "Applications", icon: "applications" as const }]
          : []),
        ...(canLeases
          ? [{ href: "/dashboard/leases", label: "Leases", icon: "leases" as const }]
          : []),
        ...(canLeases
          ? [{ href: "/dashboard/renewals", label: "Renewals", icon: "leases" as const }]
          : []),
      ],
    },
    {
      label: "Finance",
      items: [
        ...(canFinance
          ? [{ href: "/dashboard/finance/payments", label: "Payments", icon: "finance" as const }]
          : []),
        ...(canFinance
          ? [{ href: "/dashboard/finance/charges", label: "Rent & Billing", icon: "documents" as const }]
          : []),
        ...(canFinance
          ? [{ href: "/dashboard/arrears", label: "Arrears", icon: "finance" as const }]
          : []),
        ...(canFinance || canMaintenance
          ? [{ href: "/dashboard/maintenance/expenses", label: "Expenses", icon: "finance" as const }]
          : []),
        ...(canFinance
          ? [{ href: "/dashboard/finance/statements", label: "Statements", icon: "documents" as const }]
          : []),
        ...(canReports || canFinance
          ? [{ href: "/dashboard/reports", label: "Reports", icon: "reports" as const }]
          : []),
      ],
    },
    {
      label: "Maintenance",
      items: [
        ...(canMaintenance
          ? [{ href: "/dashboard/maintenance/requests", label: "Maintenance Requests", icon: "maintenance" as const }]
          : []),
        ...(canMaintenance
          ? [{ href: "/dashboard/assignments", label: "Assignments", icon: "maintenance" as const }]
          : []),
        ...(canMaintenance
          ? [{ href: "/dashboard/maintenance-history", label: "Maintenance History", icon: "documents" as const }]
          : []),
      ],
    },
    {
      label: "Owners",
      items: [
        ...(canOwners
          ? [{ href: "/dashboard/owners", label: "Owners", icon: "owners" as const }]
          : []),
        ...(canFinance || canOwners
          ? [{ href: "/dashboard/owner-statements", label: "Owner Statements", icon: "documents" as const }]
          : []),
        ...(canOwners
          ? [{ href: "/dashboard/owner-portal", label: "Owner Portal Management", icon: "owners" as const }]
          : []),
      ],
    },
    {
      label: "Sales & Marketing",
      items: [
        ...(canListings
          ? [{ href: "/dashboard/listings?type=sale", label: "For Sale", icon: "listings" as const }]
          : []),
        ...(canListings
          ? [{ href: "/dashboard/listings?type=rent", label: "For Rent", icon: "listings" as const }]
          : []),
        ...(canListings
          ? [{ href: "/dashboard/listings?type=lease", label: "For Lease", icon: "listings" as const }]
          : []),
        ...(canInquiries
          ? [{ href: "/dashboard/enquiries", label: "Enquiries", icon: "enquiries" as const }]
          : []),
        ...(canViewings
          ? [{ href: "/dashboard/viewings", label: "Viewings", icon: "viewings" as const }]
          : []),
      ],
    },
    {
      label: "People & Access",
      items: [
        ...(canUsersRoles
          ? [{ href: "/dashboard/staff", label: "Staff", icon: "staff" as const }]
          : []),
        ...(canUsersRoles
          ? [{ href: "/dashboard/staff?tab=permissions", label: "Roles & Permissions", icon: "staff" as const }]
          : []),
      ],
    },
    {
      label: "Communication",
      items: [
        ...(canNotifications
          ? [{ href: "/dashboard/notices", label: "Notices", icon: "notifications" as const }]
          : []),
        ...(canNotifications
          ? [
              {
                href: "/dashboard/notifications",
                label: "Notifications",
                icon: "notifications" as const,
                badge: notificationCount,
              },
            ]
          : []),
      ],
    },
    {
      label: "Administration",
      items: [
        ...(canUsersRoles
          ? [{ href: "/dashboard/settings", label: "Settings", icon: "settings" as const }]
          : []),
        ...(canUsersRoles
          ? [{ href: "/dashboard/audit-logs", label: "Audit Logs", icon: "documents" as const }]
          : []),
        ...(canUsersRoles
          ? [{ href: "/dashboard/system", label: "System Configuration", icon: "settings" as const }]
          : []),
      ],
    },
  ].filter((group) => group.items.length > 0);

  const quickActions: AdminQuickAction[] = [
    ...(canCreateProperty
      ? [{ href: "/dashboard/properties/new", label: "New property", icon: "properties" as const }]
      : []),
    ...(canCreateTenant
      ? [{ href: "/dashboard/tenants/new", label: "New tenant", icon: "tenants" as const }]
      : []),
    ...(canCreateListing
      ? [{ href: "/dashboard/listings/new", label: "New listing", icon: "listings" as const }]
      : []),
  ];

  return (
    <AdminChrome
      groups={groups}
      email={context.email}
      roles={context.roles}
      notificationCount={notificationCount}
      quickActions={quickActions}
      logoutSlot={<LogoutButton />}
    >
      {children}
    </AdminChrome>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardAccess>
      <Suspense fallback={<AdminChromeSkeleton />}>
        <AdminShell>{children}</AdminShell>
      </Suspense>
    </DashboardAccess>
  );
}
