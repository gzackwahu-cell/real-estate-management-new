import type { ReactNode } from "react";
import { PortalShell } from "@/components/layout/portal-shell";
import type { PortalNavItem } from "@/components/portal/portal-navigation";
import { ROLES } from "@/lib/auth/roles";

const navigation: readonly PortalNavItem[] = [
  { href: "/owner", label: "Overview" },
  { href: "/owner/properties", label: "Properties" },
  { href: "/owner/finance", label: "Finance" },
  { href: "/owner/maintenance", label: "Maintenance" },
  { href: "/owner/notices", label: "Notices" },
];

export default function OwnerLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <PortalShell
      title="Property Owner Portal"
      description="Your properties, occupancy, statements and maintenance progress."
      roles={[ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.OWNER]}
      navigation={navigation}
    >
      {children}
    </PortalShell>
  );
}
