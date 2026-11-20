import { Suspense } from "react";
import Link from "next/link";
import { ListingTable } from "@/components/dashboard/listings/listing-table";
import { withPermission } from "@/lib/auth/guards";
import { listStaffListings } from "@/lib/listings/staff-queries";

export default function ListingsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading listings...</p>}>
      <ListingsContent />
    </Suspense>
  );
}

async function ListingsContent() {
  return withPermission("listings", "view", async (_context, supabase) => {
    const listings = await listStaffListings(supabase);

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium tracking-wide text-danwell-teal uppercase">
              Sales and marketing
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-danwell-navy">Listings</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage rent and sale publication. Only published, active listings
              appear on the public website.
            </p>
          </div>
          <Link
            href="/dashboard/listings/new"
            className="inline-flex h-9 items-center rounded-lg bg-danwell-navy px-4 text-sm font-semibold text-white hover:bg-danwell-teal"
          >
            New listing
          </Link>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          {listings.length === 0 ? (
            <div className="py-10 text-center">
              <h2 className="text-lg font-semibold text-danwell-navy">No listings yet</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                Create a rent or sale listing, add public marketing details and
                publish it when it is approved.
              </p>
              <Link
                href="/dashboard/listings/new"
                className="mt-5 inline-flex rounded-lg bg-danwell-navy px-4 py-2 text-sm font-semibold text-white hover:bg-danwell-teal"
              >
                Create the first listing
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
