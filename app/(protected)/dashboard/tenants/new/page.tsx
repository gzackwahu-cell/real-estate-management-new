import Link from "next/link";
import { TenantForm } from "@/components/tenancy/tenant-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requirePermission } from "@/lib/auth/dal";

export default async function NewTenantPage() {
  await requirePermission("tenants", "create");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/dashboard/tenants"
          className="text-sm text-danwell-teal hover:underline"
        >
          ← Back to tenants
        </Link>
        <h1 className="mt-3 text-2xl font-semibold text-danwell-navy">
          Register tenant
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Store the contact and identity-reference details required for leasing.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-danwell-navy">Tenant details</CardTitle>
          <CardDescription>
            Duplicate reference numbers are rejected by the database.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TenantForm />
        </CardContent>
      </Card>
    </div>
  );
}
