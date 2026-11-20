import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { DashboardAccess } from "@/components/auth/protected-guard";
import { LogoutButton } from "@/components/auth/logout-button";
import {
  PortalNavigation,
  type PortalNavItem,
} from "@/components/portal/portal-navigation";
import { getCurrentAuthContext } from "@/lib/auth/dal";
import { hasAnyRole, ROLES } from "@/lib/auth/roles";
import { AGENCY } from "@/lib/constants/agency";

const staffNavigation: readonly PortalNavItem[] = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/properties", label: "Properties" },
  { href: "/dashboard/owners", label: "Owners" },
  { href: "/dashboard/tenants", label: "Tenants" },
  { href: "/dashboard/applications", label: "Applications" },
  { href: "/dashboard/leases", label: "Leases" },
  { href: "/dashboard/finance", label: "Finance" },
  { href: "/dashboard/maintenance", label: "Maintenance" },
  { href: "/dashboard/listings", label: "Listings" },
  { href: "/dashboard/enquiries", label: "Enquiries" },
  { href: "/dashboard/viewings", label: "Viewings" },
];

async function DashboardPortalLinks() {
  const context = await getCurrentAuthContext();
  if (!context) {
    return null;
  }

  const links = [
    ...(hasAnyRole(context.roles, [ROLES.TENANT])
      ? [{ href: "/tenant", label: "Tenant portal" }]
      : []),
    ...(hasAnyRole(context.roles, [ROLES.OWNER])
      ? [{ href: "/owner", label: "Owner portal" }]
      : []),
  ];

  if (links.length === 0) {
    return null;
  }

  return (
    <div className="flex gap-1 border-l pl-2">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-danwell-gold transition-colors hover:bg-danwell-gold/10"
        >
          {link.label}
        </Link>
      ))}
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b border-danwell-navy/10 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-danwell-navy font-semibold text-danwell-gold">
              D
            </span>
            <div>
              <p className="text-sm leading-tight font-semibold text-danwell-navy">
                {AGENCY.shortName}
              </p>
              <p className="text-[11px] text-muted-foreground">Management</p>
            </div>
          </div>

          <div className="order-3 flex w-full flex-wrap items-center gap-1 md:order-none md:w-auto md:flex-1 md:pl-4">
            <Suspense fallback={<div className="h-8" aria-hidden="true" />}>
              <PortalNavigation items={staffNavigation} />
            </Suspense>
            <Suspense fallback={null}>
              <DashboardPortalLinks />
            </Suspense>
          </div>

          <LogoutButton />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-8">
        <Suspense fallback={<p className="text-sm text-muted-foreground">Checking access...</p>}>
          <DashboardAccess>{children}</DashboardAccess>
        </Suspense>
      </main>
    </div>
  );
}
