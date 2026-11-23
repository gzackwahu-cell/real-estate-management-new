import { Suspense } from "react";
import Link from "next/link";
import { DanwellLogo } from "@/components/brand/danwell-logo";
import { AGENCY } from "@/lib/constants/agency";
import { SiteNavigation } from "./site-navigation";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-danwell-navy/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3">
        <Link
          href="/"
          aria-label={`${AGENCY.shortName} home`}
          className="shrink-0 text-white"
        >
          <DanwellLogo width={44} height={30} priority wordmarkClassName="text-white" />
        </Link>

        <div className="hidden lg:block">
          <Suspense fallback={<div className="h-9" aria-hidden="true" />}>
            <SiteNavigation />
          </Suspense>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={AGENCY.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden rounded-lg bg-danwell-gold px-3 py-2 text-sm font-semibold text-danwell-navy transition-colors hover:bg-danwell-gold/90 sm:inline-flex"
          >
            WhatsApp us
          </a>
          <Link
            href="/login"
            className="rounded-lg border border-white/25 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10"
          >
            Staff login
          </Link>

          <details className="relative lg:hidden">
            <summary
              aria-label="Open navigation menu"
              className="flex size-10 cursor-pointer list-none items-center justify-center rounded-lg border border-white/25 text-white [&::-webkit-details-marker]:hidden"
            >
              <span aria-hidden="true" className="text-lg">☰</span>
            </summary>
            <div className="absolute right-0 mt-2 w-64 rounded-xl border border-danwell-navy/10 bg-white p-2 shadow-xl">
              <Suspense fallback={<p className="p-3 text-sm text-muted-foreground">Loading...</p>}>
                <div className="[&_a]:text-danwell-navy [&_a:hover]:bg-danwell-navy/5 [&_a[aria-current=page]]:bg-danwell-navy [&_a[aria-current=page]]:text-white">
                  <SiteNavigation />
                </div>
              </Suspense>
              <a
                href={AGENCY.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 block rounded-lg bg-danwell-gold px-3 py-2 text-sm font-semibold text-danwell-navy"
              >
                WhatsApp us
              </a>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
