import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OwnerForm } from "@/components/portfolio/owner-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { withPermission } from "@/lib/auth/guards";
import { getOwner } from "@/lib/portfolio/queries";

type EditOwnerPageProps = {
  params: Promise<{ id: string }>;
};

export default function EditOwnerPage({ params }: EditOwnerPageProps) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading owner...</p>}>
      <EditOwnerContent params={params} />
    </Suspense>
  );
}

async function EditOwnerContent({ params }: EditOwnerPageProps) {
  const { id } = await params;
  const owner = await withPermission("owners", "edit", async (_context, supabase) =>
    getOwner(supabase, id),
  );

  if (!owner) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href={`/dashboard/owners/${owner.id}`}
          className="text-sm text-danwell-teal hover:underline"
        >
          ← Back to owner
        </Link>
        <h1 className="mt-3 text-2xl font-semibold text-danwell-navy">
          Edit owner
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Update contact details or deactivate this owner record.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-danwell-navy">{owner.full_name}</CardTitle>
          <CardDescription>
            Changes are validated on the server before being saved.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OwnerForm owner={owner} />
        </CardContent>
      </Card>
    </div>
  );
}
