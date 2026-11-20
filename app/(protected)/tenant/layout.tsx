import type { ReactNode } from "react";
import { PortalShell } from "@/components/layout/portal-shell";
import type { PortalNavItem } from "@/components/portal/portal-navigation";
import { ROLES } from "@/lib/auth/roles";

const navigation: readonly PortalNavItem[] = [
  { href: "/tenant", label: "Overview" },
  { href: "/tenant/profile", label: "Profile" },
  { href: "/tenant/leases", label: "Leases" },
  { href: "/tenant/payments", label: "Payments" },
  { href: "/tenant/receipts", label: "Receipts" },
  { href: "/tenant/maintenance", label: "Maintenance" },
  { href: "/tenant/notices", label: "Notices" },
];

export default function TenantLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <PortalShell
      title="Tenant Portal"
      description="Your tenancy, payments, receipts and maintenance requests."
      roles={[ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TENANT]}
      navigation={navigation}
    >
      {children}
    </PortalShell>
  );
}
