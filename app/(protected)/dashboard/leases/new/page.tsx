import Link from "next/link";
import { z } from "zod";
import { LeaseForm } from "@/components/tenancy/lease-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { withPermission } from "@/lib/auth/guards";
import { firstParam } from "@/lib/tenancy/constants";
import { getTenantOptions, getUnitOptions } from "@/lib/tenancy/queries";

type NewLeasePageProps = {
  searchParams: Promise<{
    tenant?: string | string[];
    unit?: string | string[];
    application?: string | string[];
  }>;
};

function uuidOrUndefined(value: string | string[] | undefined): string | undefined {
  const candidate = firstParam(value);
  return candidate && z.uuid().safeParse(candidate).success ? candidate : undefined;
}

export default async function NewLeasePage({ searchParams }: NewLeasePageProps) {
  const params = await searchParams;
  const tenantId = uuidOrUndefined(params.tenant);
  const unitId = uuidOrUndefined(params.unit);
  const applicationId = uuidOrUndefined(params.application);

  const [tenants, units] = await withPermission("leases", "create", async (_context, supabase) =>
    Promise.all([
      getTenantOptions(supabase, tenantId),
      getUnitOptions(supabase, unitId),
    ]),
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/dashboard/leases"
          className="text-sm text-danwell-teal hover:underline"
        >
          ← Back to leases
        </Link>
        <h1 className="mt-3 text-2xl font-semibold text-danwell-navy">New lease</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Link one active tenant to one active rental unit.
        </p>
      </div>

      {applicationId ? (
        <p className="rounded-lg border border-danwell-teal/20 bg-danwell-teal/10 px-3 py-2 text-sm text-danwell-navy">
          This lease will be linked to the approved application as its next step.
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-danwell-navy">Lease details</CardTitle>
          <CardDescription>
            Active and pending leases cannot overlap for the same unit.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LeaseForm
            tenants={tenants}
            units={units}
            mode="create"
            initialTenantId={tenantId}
            initialUnitId={unitId}
            initialSourceApplicationId={applicationId}
          />
        </CardContent>
      </Card>
    </div>
  );
}
