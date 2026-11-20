import Link from "next/link";
import { ApplicationForm } from "@/components/tenancy/application-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { withPermission } from "@/lib/auth/guards";
import { getUnitOptions } from "@/lib/tenancy/queries";

export default async function NewApplicationPage() {
  const units = await withPermission("tenants", "create", async (_context, supabase) =>
    getUnitOptions(supabase),
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/dashboard/applications"
          className="text-sm text-danwell-teal hover:underline"
        >
          ← Back to applications
        </Link>
        <h1 className="mt-3 text-2xl font-semibold text-danwell-navy">
          New rental application
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Record applicant details before any tenant or lease record exists.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-danwell-navy">Application details</CardTitle>
          <CardDescription>
            Only active vacant or reserved units can be selected.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ApplicationForm units={units} defaultDate={new Date().toISOString().slice(0, 10)} />
        </CardContent>
      </Card>
    </div>
  );
}
