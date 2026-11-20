"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";

export type PortalNavItem = {
  href: string;
  label: string;
};

export function PortalNavigation({
  items,
}: {
  items: readonly PortalNavItem[];
}) {
  const pathname = usePathname();
  const activeHref = items
    .filter(
      (item) =>
        pathname === item.href || pathname.startsWith(`${item.href}/`),
    )
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <nav
      aria-label="Portal navigation"
      className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 md:mx-0 md:px-0 md:pb-0"
    >
      {items.map((item) => {
        const active = item.href === activeHref;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
              active
                ? "bg-danwell-navy text-white"
                : "text-muted-foreground hover:bg-danwell-navy/5 hover:text-danwell-navy",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
