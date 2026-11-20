import { Suspense } from "react";
import { EnquiryTable } from "@/components/dashboard/listings/enquiry-table";
import { withPermission } from "@/lib/auth/guards";
import { listStaffEnquiries } from "@/lib/listings/staff-queries";

export default function EnquiriesPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading enquiries...</p>}>
      <EnquiriesContent />
    </Suspense>
  );
}

async function EnquiriesContent() {
  return withPermission("inquiries", "view", async (_context, supabase) => {
    const enquiries = await listStaffEnquiries(supabase);

    return (
      <div className="space-y-6">
        <div>
          <p className="text-xs font-medium tracking-wide text-danwell-teal uppercase">
            Sales and marketing
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-danwell-navy">Enquiries</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Website enquiries are private and visible only to authorized staff.
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          {enquiries.length === 0 ? (
            <div className="py-10 text-center">
              <h2 className="text-lg font-semibold text-danwell-navy">No enquiries yet</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                When a visitor sends a property enquiry, it will appear here with
                its status and follow-up notes.
              </p>
            </div>
          ) : (
            <EnquiryTable enquiries={enquiries} />
          )}
        </div>
      </div>
    );
  });
}
