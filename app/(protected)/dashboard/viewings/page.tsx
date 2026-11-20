import { Suspense } from "react";
import { ViewingTable } from "@/components/dashboard/listings/viewing-table";
import { withPermission } from "@/lib/auth/guards";
import { listStaffViewings } from "@/lib/listings/staff-queries";

export default function ViewingsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading viewing requests...</p>}>
      <ViewingsContent />
    </Suspense>
  );
}

async function ViewingsContent() {
  return withPermission("viewings", "view", async (_context, supabase) => {
    const viewings = await listStaffViewings(supabase);

    return (
      <div className="space-y-6">
        <div>
          <p className="text-xs font-medium tracking-wide text-danwell-teal uppercase">
            Sales and marketing
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-danwell-navy">
            Viewing requests
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Confirm, complete or cancel property viewings submitted through the
            public website.
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          {viewings.length === 0 ? (
            <div className="py-10 text-center">
              <h2 className="text-lg font-semibold text-danwell-navy">
                No viewing requests yet
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                Website viewing requests will appear here with preferred dates
                and follow-up status.
              </p>
            </div>
          ) : (
            <ViewingTable viewings={viewings} />
          )}
        </div>
      </div>
    );
  });
}
