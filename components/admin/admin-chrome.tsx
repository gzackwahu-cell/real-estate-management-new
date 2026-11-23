"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowUpRight,
  Bell,
  Building,
  CalendarCheck,
  ChartNoAxesCombined,
  ClipboardList,
  ExternalLink,
  FileText,
  KeyRound,
  Landmark,
  LayoutDashboard,
  MailOpen,
  Megaphone,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  ShieldCheck,
  UsersRound,
  Wallet,
  Wrench,
  X,
} from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { DanwellLogo } from "@/components/brand/danwell-logo";
import { cn } from "cn";

const iconMap = {
  dashboard: LayoutDashboard,
  reports: ChartNoAxesCombined,
  properties: Building,
  owners: UsersRound,
  tenants: UsersRound,
  applications: ClipboardList,
  leases: KeyRound,
  finance: Wallet,
  maintenance: Wrench,
  listings: Megaphone,
  enquiries: MailOpen,
  viewings: CalendarCheck,
  notifications: Bell,
  staff: ShieldCheck,
  documents: FileText,
  land: Landmark,
} as const;

export type AdminNavIcon = keyof typeof iconMap;

export type AdminNavItem = {
  href: string;
  label: string;
  icon: AdminNavIcon;
  badge?: number;
};

export type AdminNavGroup = {
  label: string;
  items: readonly AdminNavItem[];
};

export type AdminQuickAction = {
  href: string;
  label: string;
  icon?: AdminNavIcon;
};

type AdminChromeProps = {
  groups: readonly AdminNavGroup[];
  email: string | null;
  roles: readonly string[];
  notificationCount: number;
  quickActions: readonly AdminQuickAction[];
  logoutSlot: ReactNode;
  children: ReactNode;
};

const roleLabels: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  finance: "Finance",
  property_manager: "Property Manager",
  caretaker: "Caretaker",
  field_agent: "Field Agent",
  tenant: "Tenant",
  owner: "Owner",
};

function initials(email: string | null): string {
  if (!email) return "DA";
  const [name] = email.split("@");
  const parts = name.split(/[._-]/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function Sidebar({
  groups,
  activeHref,
  collapsed,
  mobile,
  onCollapse,
  onClose,
}: {
  groups: readonly AdminNavGroup[];
  activeHref: string;
  collapsed: boolean;
  mobile: boolean;
  onCollapse: () => void;
  onClose?: () => void;
}) {
  return (
    <aside
      aria-label="Admin navigation"
      className={cn(
        "flex h-full flex-col border-r border-danwell-navy/10 bg-danwell-navy text-white",
        mobile ? "w-64" : collapsed ? "w-16" : "w-60",
      )}
    >
      <div
        className={cn(
          "flex h-14 shrink-0 items-center border-b border-white/10",
          collapsed && !mobile ? "justify-center px-2" : "justify-between px-4",
        )}
      >
        <Link
          href="/dashboard"
          className="flex min-w-0 items-center"
          aria-label="Danwell admin home"
        >
          <DanwellLogo
            width={36}
            height={24}
            priority
            showWordmark={!collapsed || mobile}
            wordmarkClassName="text-white"
            className="min-w-0"
          />
        </Link>
        {mobile ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
            aria-label="Close navigation"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        ) : null}
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {groups.map((group) => (
          <div key={group.label} className="mb-4">
            {!collapsed || mobile ? (
              <p className="px-2 pb-1.5 text-[10px] font-semibold tracking-[0.14em] text-white/40 uppercase">
                {group.label}
              </p>
            ) : (
              <div className="mx-2 mb-2 border-t border-white/10" />
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = iconMap[item.icon] ?? LayoutDashboard;
                const active =
                  item.href === activeHref ||
                  (item.href !== "/dashboard" &&
                    activeHref.startsWith(`${item.href}/`));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed && !mobile ? item.label : undefined}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group flex items-center rounded-lg text-sm transition-colors",
                      collapsed && !mobile ? "justify-center px-2 py-2" : "gap-2.5 px-2 py-1.5",
                      active
                        ? "bg-white/12 text-white"
                        : "text-white/65 hover:bg-white/8 hover:text-white",
                    )}
                  >
                    <Icon aria-hidden="true" className="size-4 shrink-0" />
                    {!collapsed || mobile ? (
                      <>
                        <span className="min-w-0 flex-1 truncate">
                          {item.label}
                        </span>
                        {item.badge && item.badge > 0 ? (
                          <span className="rounded-full bg-danwell-gold px-1.5 text-[10px] font-semibold text-danwell-navy tabular-nums">
                            {item.badge > 99 ? "99+" : item.badge}
                          </span>
                        ) : null}
                      </>
                    ) : item.badge && item.badge > 0 ? (
                      <span className="absolute mt-5 ml-5 size-1.5 rounded-full bg-danwell-gold" />
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-white/10 p-2">
        <Link
          href="/"
          target="_blank"
          title={collapsed && !mobile ? "View website" : undefined}
          className={cn(
            "flex items-center rounded-lg text-xs text-white/60 transition-colors hover:bg-white/10 hover:text-white",
            collapsed && !mobile ? "justify-center px-2 py-2" : "gap-2.5 px-2 py-1.5",
          )}
        >
          <ExternalLink aria-hidden="true" className="size-4 shrink-0" />
          {!collapsed || mobile ? <span>View website</span> : null}
        </Link>
        {!mobile ? (
          <button
            type="button"
            onClick={onCollapse}
            className={cn(
              "mt-1 flex w-full items-center rounded-lg text-xs text-white/60 transition-colors hover:bg-white/10 hover:text-white",
              collapsed ? "justify-center px-2 py-2" : "gap-2.5 px-2 py-1.5",
            )}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <PanelLeftOpen aria-hidden="true" className="size-4" />
            ) : (
              <PanelLeftClose aria-hidden="true" className="size-4" />
            )}
            {!collapsed ? <span>Collapse menu</span> : null}
          </button>
        ) : null}
      </div>
    </aside>
  );
}

export function AdminChrome({
  groups,
  email,
  roles,
  notificationCount,
  quickActions,
  logoutSlot,
  children,
}: AdminChromeProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [prevPathname, setPrevPathname] = useState(pathname);

  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setMobileOpen(false);
    setSearchOpen(false);
  }

  const allLinks = useMemo(
    () => groups.flatMap((group) => group.items),
    [groups],
  );

  const searchResults = useMemo(() => {
    const term = search.trim().toLowerCase();
    const combined = [
      ...allLinks.map((item) => ({ ...item, type: "Module" })),
      ...quickActions.map((item) => ({
        href: item.href,
        label: item.label,
        icon: item.icon ?? "dashboard",
        type: "Quick action",
      })),
    ];
    if (!term) return combined.slice(0, 6);
    return combined
      .filter((item) => item.label.toLowerCase().includes(term))
      .slice(0, 8);
  }, [allLinks, quickActions, search]);

  const activeHref = allLinks
    .filter(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
    )
    .sort((a, b) => b.href.length - a.href.length)[0]?.href ?? "/dashboard";
  const activeLabel =
    allLinks.find((item) => item.href === activeHref)?.label ?? "Overview";

  return (
    <div className="min-h-screen bg-muted/25">
      <div className="fixed inset-y-0 left-0 z-30 hidden md:block">
        <Sidebar
          groups={groups}
          activeHref={activeHref}
          collapsed={collapsed}
          mobile={false}
          onCollapse={() => setCollapsed((value) => !value)}
        />
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-danwell-navy/50"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 shadow-2xl">
            <Sidebar
              groups={groups}
              activeHref={activeHref}
              collapsed={false}
              mobile
              onCollapse={() => undefined}
              onClose={() => setMobileOpen(false)}
            />
          </div>
        </div>
      ) : null}

      <div
        className={cn(
          "min-h-screen transition-[padding] duration-200",
          collapsed ? "md:pl-16" : "md:pl-60",
        )}
      >
        <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur-md">
          <div className="mx-auto flex h-14 w-full max-w-[1600px] items-center gap-2 px-3 sm:px-4">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 text-danwell-navy hover:bg-muted md:hidden"
              aria-label="Open navigation"
            >
              <Menu aria-hidden="true" className="size-4" />
            </button>

            <div className="hidden min-w-0 items-center gap-2 text-sm sm:flex">
              <span className="text-muted-foreground">Admin</span>
              <span className="text-muted-foreground/60">/</span>
              <span className="truncate font-medium text-danwell-navy">
                {activeLabel}
              </span>
            </div>

            <div
              className="relative mx-auto hidden w-full max-w-sm lg:block"
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) {
                  setSearchOpen(false);
                }
              }}
            >
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
              />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
                placeholder="Search modules and actions"
                aria-label="Search modules and actions"
                className="h-8 w-full rounded-lg border border-input bg-muted/40 pr-3 pl-8 text-xs outline-none focus:border-ring focus:bg-background focus:ring-2 focus:ring-ring/20"
              />
              {searchOpen && searchResults.length > 0 ? (
                <div className="absolute top-full right-0 left-0 mt-1 overflow-hidden rounded-xl border bg-popover p-1 shadow-lg">
                  {searchResults.map((item) => {
                    const Icon = iconMap[item.icon as AdminNavIcon] ?? LayoutDashboard;
                    return (
                      <Link
                        key={`${item.type}-${item.href}`}
                        href={item.href}
                        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-muted"
                      >
                        <Icon aria-hidden="true" className="size-3.5 text-danwell-teal" />
                        <span className="flex-1 truncate">{item.label}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {item.type}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              ) : null}
            </div>

            <div className="ml-auto flex items-center gap-1.5">
              <div className="hidden items-center gap-1.5 sm:flex">
                {quickActions.slice(0, 1).map((action) => {
                  const Icon = action.icon ? iconMap[action.icon] : Plus;
                  return (
                    <Link
                      key={action.href}
                      href={action.href}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-danwell-navy px-2.5 text-xs font-medium text-white hover:bg-danwell-navy/90"
                    >
                      <Icon aria-hidden="true" className="size-3.5" />
                      {action.label}
                    </Link>
                  );
                })}
              </div>

              <Link
                href="/dashboard/notifications"
                className="relative flex size-8 items-center justify-center rounded-lg text-danwell-navy hover:bg-muted"
                aria-label={`Notifications${notificationCount > 0 ? `, ${notificationCount} unread` : ""}`}
              >
                <Bell aria-hidden="true" className="size-4" />
                {notificationCount > 0 ? (
                  <span className="absolute top-1 right-1 flex min-w-4 items-center justify-center rounded-full bg-danwell-gold px-1 text-[9px] font-bold text-danwell-navy tabular-nums">
                    {notificationCount > 99 ? "99+" : notificationCount}
                  </span>
                ) : null}
              </Link>

              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-2 rounded-lg border bg-card px-1.5 py-1 text-left hover:bg-muted"
                    aria-label="Account menu"
                  >
                    <span className="flex size-6 items-center justify-center rounded-md bg-danwell-teal text-[10px] font-semibold text-white">
                      {initials(email)}
                    </span>
                    <span className="hidden min-w-0 lg:block">
                      <span className="block max-w-36 truncate text-xs font-medium text-danwell-navy">
                        {roles.map((role) => roleLabels[role] ?? role).join(", ") || "Staff"}
                      </span>
                      <span className="block max-w-36 truncate text-[10px] text-muted-foreground">
                        {email ?? "Signed in"}
                      </span>
                    </span>
                  </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content
                    align="end"
                    sideOffset={6}
                    className="z-50 w-56 rounded-xl border bg-popover p-1 shadow-lg"
                  >
                    <div className="border-b px-2 py-2">
                      <p className="truncate text-xs font-medium text-foreground">
                        {email ?? "Danwell staff"}
                      </p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        {roles.map((role) => roleLabels[role] ?? role).join(", ") || "Staff account"}
                      </p>
                    </div>
                    <DropdownMenu.Item asChild>
                      <Link
                        href="/"
                        target="_blank"
                        className="mt-1 flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs outline-none hover:bg-muted focus:bg-muted"
                      >
                        <ArrowUpRight aria-hidden="true" className="size-3.5" />
                        View public website
                      </Link>
                    </DropdownMenu.Item>
                    <div className="mt-1 border-t px-2 py-2">{logoutSlot}</div>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1600px] px-3 py-5 sm:px-4 sm:py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
