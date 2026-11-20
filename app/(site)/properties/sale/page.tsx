import type { Metadata } from "next";
import { Suspense } from "react";
import { PropertyGridSkeleton } from "@/components/public/property-grid";
import { PropertyListView } from "@/components/public/property-list-view";
import type { PublicSearchParams } from "@/lib/listings/validation";

export const metadata: Metadata = {
  title: "Properties for Sale in Kenya",
  description:
    "Browse approved houses, apartments, land and commercial properties for sale in Kenya with Danwell Property Management Agency.",
  alternates: { canonical: "/properties/sale" },
};

function SaleListingsSkeleton() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10" aria-hidden="true">
      <div className="h-40 animate-pulse rounded-2xl bg-danwell-navy/10" />
      <div className="mt-8 h-6 w-48 animate-pulse rounded bg-danwell-navy/10" />
      <div className="mt-6">
        <PropertyGridSkeleton />
      </div>
    </div>
  );
}

export default function SalePropertiesPage({
  searchParams,
}: {
  searchParams: Promise<PublicSearchParams>;
}) {
  return (
    <Suspense fallback={<SaleListingsSkeleton />}>
      <PropertyListView category="sale" searchParams={searchParams} />
    </Suspense>
  );
}
