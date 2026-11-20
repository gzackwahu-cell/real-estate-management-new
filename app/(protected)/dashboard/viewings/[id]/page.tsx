import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FollowUpForm } from "@/components/dashboard/listings/follow-up-form";
import { withPermission } from "@/lib/auth/guards";
import { getStaffViewing } from "@/lib/listings/staff-queries";
import { formatDate } from "@/lib/tenancy/constants";

type ViewingDetailProps = {
  params: Promise<{ id: string }>;
};

export default function ViewingDetailPage({ params }: ViewingDetailProps) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading viewing request...</p>}>
      <ViewingDetailContent params={params} />
    </Suspense>
  );
}

async function ViewingDetailContent({ params }: ViewingDetailProps) {
  const { id } = await params;

  return withPermission("viewings", "view", async (_context, supabase) => {
    const viewing = await getStaffViewing(supabase, id);
    if (!viewing) {
      notFound();
    }

    return (
      <div className="space-y-6">
        <Link href="/dashboard/viewings" className="inline-block text-sm text-danwell-teal hover:underline">
          ← Back to viewing requests
        </Link>

        <div>
          <p className="text-xs font-medium tracking-wide text-danwell-teal uppercase">
            Viewing request
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-danwell-navy">
            {viewing.full_name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Requested {viewing.created_at ? formatDate(viewing.created_at.slice(0, 10)) : "—"}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-5 rounded-xl border bg-white p-6 shadow-sm">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Phone</dt>
                <dd className="font-medium">{viewing.phone}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Email</dt>
                <dd className="break-all font-medium">{viewing.email}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Preferred date</dt>
                <dd className="font-medium">{formatDate(viewing.preferred_date)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Preferred time</dt>
                <dd className="font-medium">{viewing.preferred_time || "Any"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Listing</dt>
                <dd className="text-right font-medium">
                  {viewing.listings ? (
                    <Link href={`/properties/${viewing.listings.slug}`} className="text-danwell-teal hover:underline">
                      {viewing.listings.title}
                    </Link>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
            </dl>

            <div>
              <h2 className="text-sm font-semibold text-danwell-navy">Message</h2>
              <p className="mt-2 whitespace-pre-line rounded-lg bg-muted/50 p-4 text-sm">
                {viewing.message}
              </p>
            </div>
          </div>

          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-danwell-navy">Manage viewing</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Update status and record private follow-up notes.
            </p>
            <div className="mt-5">
              <FollowUpForm
                kind="viewing"
                id={viewing.id}
                status={viewing.status}
                notes={viewing.follow_up_notes}
              />
            </div>
          </div>
        </div>
      </div>
    );
  });
}
