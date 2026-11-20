import { Suspense } from "react";
import Link from "next/link";
import { RecordPaymentForm } from "@/components/finance/record-payment-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { withPermission } from "@/lib/auth/guards";
import { firstParam } from "@/lib/finance/constants";
import { getLeaseOptions, getPaymentMethods } from "@/lib/finance/queries";

type NewPaymentPageProps = {
  searchParams: Promise<{ lease?: string | string[] }>;
};

export default function NewPaymentPage({ searchParams }: NewPaymentPageProps) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading payment form...</p>}>
      <NewPaymentContent searchParams={searchParams} />
    </Suspense>
  );
}

async function NewPaymentContent({ searchParams }: NewPaymentPageProps) {
  const params = await searchParams;
  const requestedLease = firstParam(params.lease);

  const { leases, methods } = await withPermission(
    "payments",
    "create",
    async (_context, supabase) => {
      const [leaseRows, paymentMethods] = await Promise.all([
        getLeaseOptions(supabase),
        getPaymentMethods(supabase),
      ]);
      return { leases: leaseRows, methods: paymentMethods };
    },
  );

  const leaseOptions = leases
    .filter((lease) => Boolean(lease.tenants))
    .map((lease) => ({
      id: lease.id,
      label: `${lease.tenants?.full_name ?? "Tenant"} · ${lease.units?.unit_number ?? "Unit"} · ${
        lease.units?.properties?.title ?? "Property"
      } (${lease.status})`,
      tenantId: lease.tenant_id,
      defaultAmount: lease.monthly_rent,
    }));

  const initialLeaseId = leaseOptions.some((lease) => lease.id === requestedLease)
    ? requestedLease
    : leaseOptions[0]?.id;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link
          href="/dashboard/finance/payments"
          className="text-sm text-danwell-teal hover:underline"
        >
          ← Back to payments
        </Link>
        <h1 className="mt-3 text-2xl font-semibold text-danwell-navy">Record a payment</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Rent payments are allocated oldest charge first. Deposit payments update the
          separate deposit ledger.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-danwell-navy">Payment details</CardTitle>
          <CardDescription>
            The server validates permissions, property assignment, references and duplicate
            transaction references.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RecordPaymentForm
            leases={leaseOptions}
            paymentMethods={methods}
            initialLeaseId={initialLeaseId}
            today={new Date().toISOString().slice(0, 10)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
