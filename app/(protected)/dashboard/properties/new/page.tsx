import { Suspense } from "react";
import Link from "next/link";
import { PropertyForm } from "@/components/portfolio/property-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requirePermission } from "@/lib/auth/dal";
import { withPermission } from "@/lib/auth/guards";
import { getOwnerOptions } from "@/lib/portfolio/queries";

export default function NewPropertyPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Checking access...</p>}>
      <NewPropertyContent />
    </Suspense>
  );
}

async function NewPropertyContent() {
  await requirePermission("properties", "create");
  const owners = await withPermission("owners", "view", async (_context, supabase) =>
    getOwnerOptions(supabase),
  );

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/properties"
          className="text-sm text-danwell-teal hover:underline"
        >
          ← Back to properties
        </Link>
        <h1 className="mt-3 text-2xl font-semibold text-danwell-navy">
          Register property
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Add location details and link one or more owners. Units can be added
          after the property is registered.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-danwell-navy">Property details</CardTitle>
          <CardDescription>
            Ownership percentages may stay pending until verification is complete.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PropertyForm owners={owners} />
        </CardContent>
      </Card>
    </div>
  );
}
