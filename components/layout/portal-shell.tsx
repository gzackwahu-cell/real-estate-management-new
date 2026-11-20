import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { LogoutButton } from "@/components/auth/logout-button";
import { RequireRoles } from "@/components/auth/protected-guard";
import {
  PortalNavigation,
  type PortalNavItem,
} from "@/components/portal/portal-navigation";
import { getCurrentAuthContext } from "@/lib/auth/dal";
import { hasAnyRole, STAFF_ROLES } from "@/lib/auth/roles";
import { AGENCY } from "@/lib/constants/agency";
import type { RoleName } from "@/lib/auth/roles";

type PortalShellProps = {
  title: string;
  description: string;
  roles: RoleName[];
  navigation: readonly PortalNavItem[];
  children: ReactNode;
};

async function StaffDashboardLink() {
  const context = await getCurrentAuthContext();
  if (!context || !hasAnyRole(context.roles, STAFF_ROLES)) {
    return null;
  }

  return (
    <Link
      href="/dashboard"
      className="inline-flex h-8 items-center rounded-lg border px-3 text-xs font-medium text-danwell-navy transition-colors hover:bg-muted"
    >
      Staff dashboard
    </Link>
  );
}

export function PortalShell({
  title,
  description,
  roles,
  navigation,
  children,
}: PortalShellProps) {
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
                {title}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {AGENCY.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Suspense fallback={null}>
              <StaffDashboardLink />
            </Suspense>
            <LogoutButton />
          </div>

          <div className="order-3 w-full md:order-none md:w-auto md:flex-1 md:pl-4">
            <Suspense fallback={<div className="h-8" aria-hidden="true" />}>
              <PortalNavigation items={navigation} />
            </Suspense>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-8">
        <p className="mb-6 text-sm text-muted-foreground">{description}</p>
        <Suspense fallback={<p className="text-sm text-muted-foreground">Checking access...</p>}>
          <RequireRoles roles={roles}>{children}</RequireRoles>
        </Suspense>
      </main>
    </div>
  );
}
