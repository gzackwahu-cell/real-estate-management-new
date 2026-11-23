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
        ...(canReports
          ? [{ href: "/dashboard/reports", label: "Reports", icon: "reports" as const }]
          : []),
      ],
    },
    {
      label: "Portfolio",
      items: [
        ...(canProperties
          ? [{ href: "/dashboard/properties", label: "Properties", icon: "properties" as const }]
          : []),
        ...(canOwners
          ? [{ href: "/dashboard/owners", label: "Owners", icon: "owners" as const }]
          : []),
        ...(canTenants
          ? [{ href: "/dashboard/tenants", label: "Tenants", icon: "tenants" as const }]
          : []),
        ...(canTenants || canProperties
          ? [{ href: "/dashboard/applications", label: "Applications", icon: "applications" as const }]
          : []),
        ...(canLeases
          ? [{ href: "/dashboard/leases", label: "Leases", icon: "leases" as const }]
          : []),
      ],
    },
    {
      label: "Operations",
      items: [
        ...(canFinance
          ? [{ href: "/dashboard/finance", label: "Finance", icon: "finance" as const }]
          : []),
        ...(canMaintenance
          ? [{ href: "/dashboard/maintenance", label: "Maintenance", icon: "maintenance" as const }]
          : []),
        ...(canListings
          ? [{ href: "/dashboard/listings", label: "Listings", icon: "listings" as const }]
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
      label: "Administration",
      items: [
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
        ...(canUsersRoles
          ? [{ href: "/dashboard/staff", label: "Staff & access", icon: "staff" as const }]
          : []),
        ...(canUsersRoles
          ? [{ href: "/dashboard/locations", label: "Locations", icon: "land" as const }]
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
