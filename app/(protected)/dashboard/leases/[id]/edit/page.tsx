import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LeaseForm } from "@/components/tenancy/lease-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { withPermission } from "@/lib/auth/guards";
import { formatDate } from "@/lib/tenancy/constants";
import { getLease, getTenantOptions, getUnitOptions } from "@/lib/tenancy/queries";

type EditLeasePageProps = {
  params: Promise<{ id: string }>;
};

export default function EditLeasePage({ params }: EditLeasePageProps) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading lease...</p>}>
      <EditLeaseContent params={params} />
    </Suspense>
  );
}

async function EditLeaseContent({ params }: EditLeasePageProps) {
  const { id } = await params;
  const [lease, tenants, units] = await withPermission(
    "leases",
    "edit",
    async (_context, supabase) => {
      const lease = await getLease(supabase, id);
      if (!lease) {
        return [null, [], []] as const;
      }

      const [tenants, units] = await Promise.all([
        getTenantOptions(supabase, lease.tenant_id),
        getUnitOptions(supabase, lease.unit_id),
      ]);
      return [lease, tenants, units] as const;
    },
  );

  if (!lease) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href={`/dashboard/leases/${lease.id}`}
          className="text-sm text-danwell-teal hover:underline"
        >
          ← Back to lease
        </Link>
        <h1 className="mt-3 text-2xl font-semibold text-danwell-navy">Edit lease</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {lease.units?.unit_number ?? "Unit"} · {formatDate(lease.start_date)} –{" "}
          {formatDate(lease.end_date)}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-danwell-navy">Lease details</CardTitle>
          <CardDescription>
            Termination requires a date and reason. Lease history is retained.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LeaseForm tenants={tenants} units={units} mode="edit" lease={lease} />
        </CardContent>
      </Card>
    </div>
  );
}
