"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";
import { INFO_ROUTES } from "@/components/public/info/info-links";

const links = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/properties/rent", label: "For rent" },
  { href: "/properties/sale", label: "For sale" },
  { href: "/properties/lease", label: "For lease" },
  { href: "/faq", label: "Information" },
  { href: "/contact", label: "Contact" },
] as const;

function isActiveLink(pathname: string, href: string): boolean {
  if (href === "/faq") {
    return INFO_ROUTES.some(
      (route) => pathname === route || pathname.startsWith(`${route}/`),
    );
  }
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteNavigation() {
  const pathname = usePathname();

  return (
    <nav aria-label="Main navigation" className="flex flex-wrap items-center gap-1">
      {links.map((link) => {
        const active = isActiveLink(pathname, link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-danwell-navy text-white"
                : "text-white/80 hover:bg-white/10 hover:text-white",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
