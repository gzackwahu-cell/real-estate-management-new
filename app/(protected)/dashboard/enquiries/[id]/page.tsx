import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FollowUpForm } from "@/components/dashboard/listings/follow-up-form";
import { withPermission } from "@/lib/auth/guards";
import { getStaffEnquiry } from "@/lib/listings/staff-queries";
import { formatDate } from "@/lib/tenancy/constants";

type EnquiryDetailProps = {
  params: Promise<{ id: string }>;
};

export default function EnquiryDetailPage({ params }: EnquiryDetailProps) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading enquiry...</p>}>
      <EnquiryDetailContent params={params} />
    </Suspense>
  );
}

async function EnquiryDetailContent({ params }: EnquiryDetailProps) {
  const { id } = await params;

  return withPermission("inquiries", "view", async (_context, supabase) => {
    const enquiry = await getStaffEnquiry(supabase, id);
    if (!enquiry) {
      notFound();
    }

    return (
      <div className="space-y-6">
        <Link href="/dashboard/enquiries" className="inline-block text-sm text-danwell-teal hover:underline">
          ← Back to enquiries
        </Link>

        <div>
          <p className="text-xs font-medium tracking-wide text-danwell-teal uppercase">
            Property enquiry
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-danwell-navy">
            {enquiry.full_name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Received {enquiry.created_at ? formatDate(enquiry.created_at.slice(0, 10)) : "—"} · Source: {enquiry.source}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-5 rounded-xl border bg-white p-6 shadow-sm">
            <div>
              <h2 className="text-sm font-semibold text-danwell-navy">Contact details</h2>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Phone</dt>
                  <dd className="font-medium">{enquiry.phone}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Email</dt>
                  <dd className="break-all font-medium">{enquiry.email}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Preferred date</dt>
                  <dd className="font-medium">{formatDate(enquiry.preferred_date)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Listing</dt>
                  <dd className="text-right font-medium">
                    {enquiry.listings ? (
                      <Link href={`/properties/${enquiry.listings.slug}`} className="text-danwell-teal hover:underline">
                        {enquiry.listings.title}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </dd>
                </div>
              </dl>
            </div>

            <div>
              <h2 className="text-sm font-semibold text-danwell-navy">Message</h2>
              <p className="mt-2 whitespace-pre-line rounded-lg bg-muted/50 p-4 text-sm">
                {enquiry.message}
              </p>
            </div>
          </div>

          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-danwell-navy">Follow-up</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Update status and record private follow-up notes.
            </p>
            <div className="mt-5">
              <FollowUpForm
                kind="enquiry"
                id={enquiry.id}
                status={enquiry.status}
                notes={enquiry.follow_up_notes}
              />
            </div>
          </div>
        </div>
      </div>
    );
  });
}
