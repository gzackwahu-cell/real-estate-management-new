import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { UnitForm } from "@/components/portfolio/unit-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requirePermission } from "@/lib/auth/dal";
import { withPermission } from "@/lib/auth/guards";
import { getProperty } from "@/lib/portfolio/queries";

type NewUnitPageProps = {
  params: Promise<{ id: string }>;
};

export default function NewUnitPage({ params }: NewUnitPageProps) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Checking access...</p>}>
      <NewUnitContent params={params} />
    </Suspense>
  );
}

async function NewUnitContent({ params }: NewUnitPageProps) {
  const { id } = await params;
  await requirePermission("units", "create");

  const property = await withPermission(
    "properties",
    "view",
    async (_context, supabase) => getProperty(supabase, id),
  );

  if (!property) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href={`/dashboard/properties/${property.id}`}
          className="text-sm text-danwell-teal hover:underline"
        >
          ← Back to property
        </Link>
        <h1 className="mt-3 text-2xl font-semibold text-danwell-navy">Add unit</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {property.title} · {property.county}, {property.town}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-danwell-navy">Unit details</CardTitle>
          <CardDescription>
            Record the unit type, rent expectation, deposit requirement and
            occupancy status.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UnitForm propertyId={property.id} />
        </CardContent>
      </Card>
    </div>
  );
}
