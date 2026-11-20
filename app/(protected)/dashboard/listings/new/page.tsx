import { Suspense } from "react";
import Link from "next/link";
import { ListingForm } from "@/components/dashboard/listings/listing-form";
import { withPermission } from "@/lib/auth/guards";
import {
  getPropertyOptions,
  getUnitOptions,
} from "@/lib/listings/staff-queries";

export default function NewListingPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading form...</p>}>
      <NewListingContent />
    </Suspense>
  );
}

async function NewListingContent() {
  return withPermission("listings", "create", async (_context, supabase) => {
    const [properties, units] = await Promise.all([
      getPropertyOptions(supabase),
      getUnitOptions(supabase),
    ]);

    return (
      <div className="space-y-6">
        <Link href="/dashboard/listings" className="inline-block text-sm text-danwell-teal hover:underline">
          ← Back to listings
        </Link>
        <div>
          <p className="text-xs font-medium tracking-wide text-danwell-teal uppercase">
            Sales and marketing
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-danwell-navy">New listing</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Add approved public details only. Owner, tenant and financial records
            are never included in a listing.
          </p>
        </div>

        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <ListingForm properties={properties} units={units} />
        </div>
      </div>
    );
  });
}
