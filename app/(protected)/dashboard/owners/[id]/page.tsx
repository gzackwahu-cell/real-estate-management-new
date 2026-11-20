import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/portfolio/status-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { hasPermission } from "@/lib/auth/dal";
import { withPermission } from "@/lib/auth/guards";
import {
  PROPERTY_STATUSES,
  PROPERTY_TYPES,
  labelFor,
} from "@/lib/portfolio/constants";
import { getOwnerDetail } from "@/lib/portfolio/queries";

type OwnerDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default function OwnerDetailPage({ params }: OwnerDetailPageProps) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading owner...</p>}>
      <OwnerDetailContent params={params} />
    </Suspense>
  );
}

async function OwnerDetailContent({ params }: OwnerDetailPageProps) {
  const { id } = await params;
  const detail = await withPermission("owners", "view", async (_context, supabase) =>
    getOwnerDetail(supabase, id),
  );

  if (!detail) {
    notFound();
  }

  const canEdit = await hasPermission("owners", "edit");
  const { owner, properties } = detail;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link
            href="/dashboard/owners"
            className="text-sm text-danwell-teal hover:underline"
          >
            ← Back to owners
          </Link>
          <h1 className="mt-3 text-2xl font-semibold text-danwell-navy">
            {owner.full_name}
          </h1>
          <div className="mt-2">
            <StatusBadge
              label={owner.is_active ? "Active" : "Inactive"}
              tone={owner.is_active ? "positive" : "muted"}
            />
          </div>
        </div>
        {canEdit ? (
          <Link
            href={`/dashboard/owners/${owner.id}/edit`}
            className="inline-flex h-8 items-center rounded-lg bg-danwell-navy px-3 text-sm font-medium text-white hover:bg-danwell-navy/90"
          >
            Edit owner
          </Link>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-danwell-navy">Contact details</CardTitle>
            <CardDescription>Private owner information.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2">
              <Detail label="Phone" value={owner.phone} />
              <Detail label="Email" value={owner.email || "Not provided"} />
              <Detail label="ID / reference" value={owner.id_reference} />
              <Detail label="Address" value={owner.address} className="sm:col-span-2" />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-danwell-navy">Properties</CardTitle>
            <CardDescription>
              {properties.length} ownership relationship(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {properties.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                This owner has not been linked to a property yet.
              </p>
            ) : (
              <ul className="space-y-3">
                {properties.map((assignment, index) => {
                  const property = assignment.properties;
                  if (!property) {
                    return null;
                  }

                  return (
                    <li
                      key={`${assignment.owner_id}-${assignment.property_id}-${index}`}
                      className="rounded-lg border bg-muted/30 px-3 py-2"
                    >
                      <Link
                        href={`/dashboard/properties/${property.id}`}
                        className="font-medium text-danwell-navy hover:underline"
                      >
                        {property.title}
                      </Link>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {labelFor(PROPERTY_TYPES, property.property_type)} ·{" "}
                        {property.county}, {property.town}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <StatusBadge
                          label={labelFor(PROPERTY_STATUSES, property.status)}
                        />
                        {assignment.is_primary ? (
                          <StatusBadge label="Primary owner" tone="positive" />
                        ) : null}
                        <span className="text-xs text-muted-foreground">
                          {assignment.ownership_percentage === null
                            ? "Percentage pending"
                            : `${assignment.ownership_percentage}%`}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Detail({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm text-foreground">{value}</dd>
    </div>
  );
}
