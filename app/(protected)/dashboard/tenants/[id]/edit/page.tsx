import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TenantForm } from "@/components/tenancy/tenant-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { withPermission } from "@/lib/auth/guards";
import { getTenant } from "@/lib/tenancy/queries";

type EditTenantPageProps = {
  params: Promise<{ id: string }>;
};

export default function EditTenantPage({ params }: EditTenantPageProps) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading tenant...</p>}>
      <EditTenantContent params={params} />
    </Suspense>
  );
}

async function EditTenantContent({ params }: EditTenantPageProps) {
  const { id } = await params;
  const tenant = await withPermission("tenants", "edit", async (_context, supabase) =>
    getTenant(supabase, id),
  );

  if (!tenant) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href={`/dashboard/tenants/${tenant.id}`}
          className="text-sm text-danwell-teal hover:underline"
        >
          ← Back to tenant profile
        </Link>
        <h1 className="mt-3 text-2xl font-semibold text-danwell-navy">
          Edit tenant
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{tenant.full_name}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-danwell-navy">Profile details</CardTitle>
          <CardDescription>
            Archive the tenant instead of deleting records with lease history.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TenantForm tenant={tenant} />
        </CardContent>
      </Card>
    </div>
  );
}
