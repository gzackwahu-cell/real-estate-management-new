import { Suspense } from "react";
import Link from "next/link";
import { ListingTable } from "@/components/dashboard/listings/listing-table";
import { withPermission } from "@/lib/auth/guards";
import { listStaffListings } from "@/lib/listings/staff-queries";

type Props = { searchParams: Promise<{ type?: string | string[] }> };

export default function ListingsPage({ searchParams }: Props) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading listings...</p>}>
      <ListingsContent searchParams={searchParams} />
    </Suspense>
  );
}

async function ListingsContent({ searchParams }: Props) {
  return withPermission("listings", "view", async (_context, supabase) => {
    const params = await searchParams;
    const type = Array.isArray(params.type) ? params.type[0] : params.type;
    const activeType = type === "rent" || type === "sale" || type === "lease" ? type : null;
    const allListings = await listStaffListings(supabase);
    const listings = activeType ? allListings.filter((l) => l.listing_type === activeType) : allListings;

    const tabs = [
      { label: "All", href: "/dashboard/listings", value: null },
      { label: "For rent", href: "/dashboard/listings?type=rent", value: "rent" },
      { label: "For sale", href: "/dashboard/listings?type=sale", value: "sale" },
      { label: "For lease", href: "/dashboard/listings?type=lease", value: "lease" },
    ] as const;

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium tracking-wide text-danwell-teal uppercase">Sales and marketing</p>
            <h1 className="mt-1 text-2xl font-semibold text-danwell-navy">Listings</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage rent, sale, and lease publication. Only published, active listings appear on the public website.
            </p>
          </div>
          <Link href="/dashboard/listings/new" className="inline-flex h-9 items-center rounded-lg bg-danwell-navy px-4 text-sm font-semibold text-white hover:bg-danwell-teal">
            New listing
          </Link>
        </div>

        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <Link
              key={tab.label}
              href={tab.href}
              className={`inline-flex h-8 items-center rounded-lg border px-3 text-xs font-medium ${activeType === tab.value ? "border-danwell-navy bg-danwell-navy text-white" : "hover:bg-muted"}`}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          {listings.length === 0 ? (
            <div className="py-10 text-center">
              <h2 className="text-lg font-semibold text-danwell-navy">No listings found</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                {activeType ? `No ${activeType} listings match this filter.` : "Create a listing and publish it when approved."}
              </p>
              <Link href="/dashboard/listings/new" className="mt-5 inline-flex rounded-lg bg-danwell-navy px-4 py-2 text-sm font-semibold text-white hover:bg-danwell-teal">
                Create listing
              </Link>
            </div>
          ) : (
            <ListingTable listings={listings} />
          )}
        </div>
      </div>
    );
  });
}
