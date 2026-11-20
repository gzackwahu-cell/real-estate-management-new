import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
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
import { getOwnerOptions, getPropertyDetail } from "@/lib/portfolio/queries";

type EditPropertyPageProps = {
  params: Promise<{ id: string }>;
};

export default function EditPropertyPage({ params }: EditPropertyPageProps) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading property...</p>}>
      <EditPropertyContent params={params} />
    </Suspense>
  );
}

async function EditPropertyContent({ params }: EditPropertyPageProps) {
  const { id } = await params;
  await requirePermission("properties", "edit");

  const [detail, owners] = await Promise.all([
    withPermission("properties", "edit", async (_context, supabase) =>
      getPropertyDetail(supabase, id),
    ),
    withPermission("owners", "view", async (_context, supabase) =>
      getOwnerOptions(supabase),
    ),
  ]);

  if (!detail) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/dashboard/properties/${detail.property.id}`}
          className="text-sm text-danwell-teal hover:underline"
        >
          ← Back to property
        </Link>
        <h1 className="mt-3 text-2xl font-semibold text-danwell-navy">
          Edit property
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Update property details and ownership relationships together.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-danwell-navy">
            {detail.property.title}
          </CardTitle>
          <CardDescription>
            Verified ownership percentages must total 100%.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PropertyForm
            owners={owners}
            property={detail.property}
            assignments={detail.owners}
          />
        </CardContent>
      </Card>
    </div>
  );
}
