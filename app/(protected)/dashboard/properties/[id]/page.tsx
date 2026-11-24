import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AttachmentManager } from "@/components/portfolio/attachment-manager";
import { BulkUnitForm } from "@/components/portfolio/bulk-unit-form";
import { StatusBadge } from "@/components/portfolio/status-badge";
import { LeaseSummary } from "@/components/tenancy/lease-summary";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { hasPermission } from "@/lib/auth/dal";
import { withPermission } from "@/lib/auth/guards";
import { loadAttachmentViews } from "@/lib/portfolio/attachment-queries";
import {
  OCCUPANCY_STATUSES,
  PROPERTY_STATUSES,
  PROPERTY_TYPES,
  RENT_PERIODS,
  UNIT_TYPES,
  labelFor,
} from "@/lib/portfolio/constants";
import { getPropertyDetail } from "@/lib/portfolio/queries";
import { getPropertyLeases } from "@/lib/tenancy/queries";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; q?: string; floor?: string; status?: string; type?: string }>;
};

const money = new Intl.NumberFormat("en-KE", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

function tabHref(id: string, tab: string, extra?: Record<string, string | undefined>) {
  const p = new URLSearchParams({ tab });
  for (const [k, v] of Object.entries(extra ?? {})) {
    if (v) p.set(k, v);
  }
  return `/dashboard/properties/${id}?${p.toString()}`;
}

export default function PropertyDetailPage({ params, searchParams }: Props) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading property...</p>}>
      <PropertyDetailContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function PropertyDetailContent({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const tab = ["overview", "units", "leases", "files"].includes(sp.tab ?? "") ? sp.tab! : "overview";
  const q = (sp.q ?? "").trim().toLowerCase();
  const floorFilter = (sp.floor ?? "").trim();
  const statusFilter = (sp.status ?? "").trim();
  const typeFilter = (sp.type ?? "").trim();

  const canPublish = (await hasPermission("listings", "publish")) || (await hasPermission("listings", "approve"));

  const detail = await withPermission("properties", "view", async (_context, supabase) => {
    const propertyDetail = await getPropertyDetail(supabase, id);
    if (!propertyDetail) return null;
    const canViewLeases = await hasPermission("leases", "view");
    const [leases, attachmentViews, listingResult] = await Promise.all([
      canViewLeases ? getPropertyLeases(supabase, id) : Promise.resolve([]),
      loadAttachmentViews(supabase, "property", id),
      supabase.from("listings").select("slug").eq("property_id", id).eq("is_published", true).eq("status", "active").limit(1).maybeSingle(),
    ]);
    return {
      ...propertyDetail,
      leases,
      canViewLeases,
      attachmentViews,
      approvedListingSlug: listingResult.data?.slug ?? null,
    };
  });

  if (!detail) notFound();

  const [canEditProperty, canCreateUnit, canEditUnit, canViewFinance, canUploadAttachments, canDeleteAttachments] = await Promise.all([
    hasPermission("properties", "edit"),
    hasPermission("units", "create"),
    hasPermission("units", "edit"),
    hasPermission("payments", "view"),
    hasPermission("properties", "edit"),
    hasPermission("properties", "delete"),
  ]);

  const { property, owners, units, leases, canViewLeases, attachmentViews, approvedListingSlug } = detail;
  const revalidatePaths = ["/dashboard/properties", `/dashboard/properties/${property.id}`, `/owner/properties/${property.id}`, ...(approvedListingSlug ? [`/properties/${approvedListingSlug}`] : [])];

  const totalUnits = units.length;
  const vacant = units.filter((u) => u.occupancy_status === "vacant").length;
  const occupied = units.filter((u) => u.occupancy_status === "occupied").length;
  const reserved = units.filter((u) => u.occupancy_status === "reserved").length;
  const maintenance = units.filter((u) => u.occupancy_status === "maintenance").length;
  const occupancyRate = totalUnits > 0 ? Math.round((occupied / totalUnits) * 100) : 0;

  const floors = Array.from(new Set(units.map((u) => (u.floor ?? "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const filteredUnits = units.filter((u) => {
    if (q) {
      const hay = [u.unit_number, u.unit_type, u.floor ?? "", u.public_notes ?? "", u.notes ?? "", ...(u.amenities ?? [])].join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (floorFilter && (u.floor ?? "") !== floorFilter) return false;
    if (statusFilter && u.occupancy_status !== statusFilter) return false;
    if (typeFilter && u.unit_type !== typeFilter) return false;
    return true;
  });

  const byFloor = new Map<string, typeof filteredUnits>();
  for (const unit of filteredUnits) {
    const key = (unit.floor ?? "").trim() || "Unspecified floor";
    byFloor.set(key, [...(byFloor.get(key) ?? []), unit]);
  }

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "units", label: `Units (${totalUnits})` },
    { key: "leases", label: `Leases (${leases.length})` },
    { key: "files", label: "Files" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/dashboard/properties" className="text-sm text-danwell-teal hover:underline">← Back to properties</Link>
          <h1 className="mt-3 text-2xl font-semibold text-danwell-navy">{property.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {labelFor(PROPERTY_TYPES, property.property_type)} · {property.county}, {property.town}{property.estate ? `, ${property.estate}` : ""}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge label={labelFor(PROPERTY_STATUSES, property.status)} tone={property.status === "active" ? "positive" : property.status === "maintenance" ? "warning" : "muted"} />
            <span className="text-xs text-muted-foreground">{totalUnits} unit{totalUnits === 1 ? "" : "s"} · {occupancyRate}% occupied</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {canEditProperty ? <Link href={`/dashboard/properties/${property.id}/edit`} className="inline-flex h-8 items-center rounded-lg border px-3 text-sm font-medium hover:bg-muted">Edit property</Link> : null}
          {canViewFinance ? <Link href={`/dashboard/finance?propertyId=${property.id}`} className="inline-flex h-8 items-center rounded-lg border px-3 text-sm font-medium hover:bg-muted">View finances</Link> : null}
          {canCreateUnit ? <Link href={`/dashboard/properties/${property.id}/units/new`} className="inline-flex h-8 items-center rounded-lg bg-danwell-navy px-3 text-sm font-medium text-white hover:bg-danwell-navy/90">Add unit</Link> : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b pb-2">
        {tabs.map((t) => (
          <Link key={t.key} href={tabHref(property.id, t.key)} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${tab === t.key ? "bg-danwell-navy text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
            {t.label}
          </Link>
        ))}
      </div>

      {tab === "overview" ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle className="text-lg text-danwell-navy">Property details</CardTitle></CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                <Detail label="Physical address" value={property.physical_address} />
                <Detail label="Town / county" value={`${property.town}, ${property.county}`} />
                <Detail label="Estate" value={property.estate || "Not provided"} />
                <Detail label="Type" value={labelFor(PROPERTY_TYPES, property.property_type)} />
                <Detail label="Description" value={property.description || "Not provided"} className="sm:col-span-2" />
                <Detail label="Directions" value={property.directions || "Not provided"} className="sm:col-span-2" />
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-danwell-navy">Ownership</CardTitle>
              <CardDescription>{owners.length} owner record(s)</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {owners.map((assignment) => (
                  <li key={`${assignment.owner_id}-${assignment.property_id}`} className="rounded-lg border bg-muted/30 px-3 py-2">
                    <Link href={`/dashboard/owners/${assignment.owner_id}`} className="font-medium text-danwell-navy hover:underline">
                      {assignment.owners?.full_name ?? "Owner record"}
                    </Link>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {assignment.is_primary ? <StatusBadge label="Primary" tone="positive" /> : null}
                      <span>{assignment.ownership_percentage === null ? "Percentage pending" : `${assignment.ownership_percentage}%`}</span>
                      <span>{assignment.verification_status}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="lg:col-span-3">
            <CardHeader><CardTitle className="text-lg text-danwell-navy">Unit vacancy summary</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <SummaryStat label="Total units" value={String(totalUnits)} />
                <SummaryStat label="Vacant" value={String(vacant)} tone="positive" />
                <SummaryStat label="Occupied" value={String(occupied)} tone="warning" />
                <SummaryStat label="Reserved" value={String(reserved)} />
                <SummaryStat label="Maintenance" value={String(maintenance)} tone="muted" />
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {tab === "units" ? (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <SummaryStat label="Total" value={String(totalUnits)} />
            <SummaryStat label="Vacant" value={String(vacant)} tone="positive" />
            <SummaryStat label="Occupied" value={String(occupied)} tone="warning" />
            <SummaryStat label="Reserved" value={String(reserved)} />
            <SummaryStat label="Maintenance" value={String(maintenance)} tone="muted" />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-danwell-navy">Units</CardTitle>
              <CardDescription>Manage units, floors, availability, pricing, and public listing visibility. Use filters to find units quickly.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form className="grid gap-3 md:grid-cols-5" action={`/dashboard/properties/${property.id}`} method="get">
                <input type="hidden" name="tab" value="units" />
                <input name="q" defaultValue={sp.q ?? ""} placeholder="Search unit, type, amenity..." className="h-9 rounded-lg border px-3 text-sm md:col-span-2" />
                <select name="floor" defaultValue={floorFilter} className="h-9 rounded-lg border px-3 text-sm">
                  <option value="">All floors</option>
                  {floors.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
                <select name="status" defaultValue={statusFilter} className="h-9 rounded-lg border px-3 text-sm">
                  <option value="">All statuses</option>
                  {OCCUPANCY_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <div className="flex gap-2">
                  <select name="type" defaultValue={typeFilter} className="h-9 w-full rounded-lg border px-3 text-sm">
                    <option value="">All types</option>
                    {UNIT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <button type="submit" className="h-9 rounded-lg bg-danwell-navy px-3 text-sm font-medium text-white">Filter</button>
                </div>
              </form>

              {filteredUnits.length === 0 ? (
                <div className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                  No units match the current filters.
                  {canCreateUnit ? <div className="mt-3"><Link href={`/dashboard/properties/${property.id}/units/new`} className="inline-flex h-8 items-center rounded-lg bg-danwell-navy px-3 text-sm font-medium text-white">Add unit</Link></div> : null}
                </div>
              ) : (
                <div className="space-y-6">
                  {Array.from(byFloor.entries()).map(([floor, floorUnits]) => (
                    <div key={floor} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-danwell-navy">{floor}</h3>
                        <span className="text-xs text-muted-foreground">{floorUnits.length} unit{floorUnits.length === 1 ? "" : "s"}</span>
                      </div>
                      <div className="overflow-x-auto rounded-lg border">
                        <table className="w-full min-w-[980px] text-sm">
                          <thead className="bg-muted/30 text-left text-xs text-muted-foreground">
                            <tr>
                              <th className="px-3 py-2 font-medium">Unit</th>
                              <th className="px-3 py-2 font-medium">Type</th>
                              <th className="px-3 py-2 font-medium">Beds/Baths</th>
                              <th className="px-3 py-2 font-medium">Rent</th>
                              <th className="px-3 py-2 font-medium">Deposit</th>
                              <th className="px-3 py-2 font-medium">Occupancy</th>
                              <th className="px-3 py-2 font-medium">Public</th>
                              <th className="px-3 py-2 font-medium">Status</th>
                              {canEditUnit ? <th className="px-3 py-2 text-right font-medium">Action</th> : null}
                            </tr>
                          </thead>
                          <tbody>
                            {floorUnits.map((unit) => (
                              <tr key={unit.id} className="border-t">
                                <td className="px-3 py-2 font-medium text-danwell-navy">{unit.unit_number}</td>
                                <td className="px-3 py-2">{labelFor(UNIT_TYPES, unit.unit_type)}</td>
                                <td className="px-3 py-2">{unit.bedrooms ?? "—"} / {unit.bathrooms ?? "—"}</td>
                                <td className="px-3 py-2">KES {money.format(unit.monthly_rent)} <span className="text-xs text-muted-foreground">/{labelFor(RENT_PERIODS, unit.rent_period).toLowerCase()}</span></td>
                                <td className="px-3 py-2">{unit.deposit_amount !== null ? `KES ${money.format(unit.deposit_amount)}` : unit.deposit_required ? "Required" : "No"}</td>
                                <td className="px-3 py-2"><StatusBadge label={labelFor(OCCUPANCY_STATUSES, unit.occupancy_status)} tone={unit.occupancy_status === "vacant" ? "positive" : unit.occupancy_status === "occupied" ? "warning" : "muted"} /></td>
                                <td className="px-3 py-2"><StatusBadge label={unit.is_listable ? "Listable" : "Hidden"} tone={unit.is_listable ? "neutral" : "muted"} /></td>
                                <td className="px-3 py-2"><StatusBadge label={unit.is_active ? "Active" : "Inactive"} tone={unit.is_active ? "positive" : "muted"} /></td>
                                {canEditUnit ? <td className="px-3 py-2 text-right"><Link href={`/dashboard/properties/${property.id}/units/${unit.id}/edit`} className="rounded-lg border px-2.5 py-1 text-xs hover:bg-muted">Edit</Link></td> : null}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {canCreateUnit ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-danwell-navy">Bulk unit generation</CardTitle>
                <CardDescription>Create multiple units at once for a floor or block. Existing units are not modified; duplicate unit numbers will be rejected safely.</CardDescription>
              </CardHeader>
              <CardContent>
                <BulkUnitForm propertyId={property.id} />
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : null}

      {tab === "leases" ? (
        canViewLeases ? (
          <LeaseSummary leases={leases} title="Leases" description="Lease records linked to units on this property." showTenant emptyMessage="No leases have been linked to units on this property." />
        ) : (
          <Card><CardContent className="py-8 text-sm text-muted-foreground">You do not have permission to view leases.</CardContent></Card>
        )
      ) : null}

      {tab === "files" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-danwell-navy">Images & documents</CardTitle>
            <CardDescription>Private files stay private. Public marketing images require a published listing and publish approval.</CardDescription>
          </CardHeader>
          <CardContent>
            <AttachmentManager entityType="property" entityId={property.id} attachments={attachmentViews} revalidatePaths={revalidatePaths} canUpload={canUploadAttachments} canDelete={canDeleteAttachments} allowPublic={canPublish && Boolean(approvedListingSlug)} emptyMessage="No property files have been uploaded yet." />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function Detail({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm text-foreground">{value}</dd>
    </div>
  );
}

function SummaryStat({ label, value, tone }: { label: string; value: string; tone?: "positive" | "warning" | "muted" }) {
  const toneClass = tone === "positive" ? "text-emerald-700" : tone === "warning" ? "text-amber-700" : tone === "muted" ? "text-muted-foreground" : "text-danwell-navy";
  return (
    <div className="rounded-lg border bg-white px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}
