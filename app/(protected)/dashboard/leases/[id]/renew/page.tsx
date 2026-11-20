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
import {
  addOneDay,
  formatDate,
  isCurrentLeaseStatus,
} from "@/lib/tenancy/constants";
import { getLease, getTenantOptions, getUnitOptions } from "@/lib/tenancy/queries";

type RenewLeasePageProps = {
  params: Promise<{ id: string }>;
};

export default function RenewLeasePage({ params }: RenewLeasePageProps) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading lease...</p>}>
      <RenewLeaseContent params={params} />
    </Suspense>
  );
}

async function RenewLeaseContent({ params }: RenewLeasePageProps) {
  const { id } = await params;
  const [lease, tenants, units] = await withPermission(
    "leases",
    "create",
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

  if (
    !lease ||
    (!isCurrentLeaseStatus(lease.status) && lease.status !== "expired")
  ) {
    notFound();
  }

  const nextStart = addOneDay(lease.end_date);
  const nextEnd = addOneYearMinusOneDay(nextStart);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href={`/dashboard/leases/${lease.id}`}
          className="text-sm text-danwell-teal hover:underline"
        >
          ← Back to lease
        </Link>
        <h1 className="mt-3 text-2xl font-semibold text-danwell-navy">Renew lease</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Current term ends {formatDate(lease.end_date)}. The renewal is a new
          lease linked to this record.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-danwell-navy">Renewal details</CardTitle>
          <CardDescription>
            The start date is prefilled for the day after the current term ends.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LeaseForm
            tenants={tenants}
            units={units}
            lease={lease}
            mode="renew"
            initialStartDate={nextStart}
            initialEndDate={nextEnd}
            initialMonthlyRent={String(lease.monthly_rent)}
            initialRentDueDay={lease.rent_due_day}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function addOneYearMinusOneDay(value: string): string {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  date.setUTCFullYear(date.getUTCFullYear() + 1);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}
