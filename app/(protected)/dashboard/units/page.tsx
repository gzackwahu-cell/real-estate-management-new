import { Suspense } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/portfolio/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { withPermission } from "@/lib/auth/guards";
import { OCCUPANCY_STATUSES, UNIT_TYPES, labelFor } from "@/lib/portfolio/constants";
import { getAllUnits } from "@/lib/portfolio/queries";

type Props = { searchParams: Promise<{ q?: string; status?: string; type?: string }> };

export default function UnitsPage({ searchParams }: Props) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading units...</p>}>
      <UnitsContent searchParams={searchParams} />
    </Suspense>
  );
}

async function UnitsContent({ searchParams }: Props) {
  return withPermission("units", "view", async (_context, supabase) => {
    const sp = await searchParams;
    const q = (sp.q ?? "").trim().toLowerCase();
    const status = (sp.status ?? "").trim();
    const type = (sp.type ?? "").trim();
    const all = await getAllUnits(supabase);
    const units = all.filter((u) => {
      if (q) {
        const hay = [u.unit_number, u.property_title, u.property_town, u.floor ?? "", u.unit_type].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (status && u.occupancy_status !== status) return false;
      if (type && u.unit_type !== type) return false;
      return true;
    });
    const vacant = all.filter((u) => u.occupancy_status === "vacant").length;
    const occupied = all.filter((u) => u.occupancy_status === "occupied").length;

    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Properties"
          title="Units"
          description="View and manage units across all properties. Open a property for bulk generation, floor grouping, and detailed configuration."
          actions={<Link href="/dashboard/properties" className="inline-flex h-8 items-center rounded-lg border px-3 text-sm font-medium hover:bg-muted">All properties</Link>}
        />

        <div className="grid gap-3 sm:grid-cols-4">
          <Stat label="Total units" value={String(all.length)} />
          <Stat label="Vacant" value={String(vacant)} />
          <Stat label="Occupied" value={String(occupied)} />
          <Stat label="Filtered" value={String(units.length)} />
        </div>

        <Card>
          <CardContent className="space-y-4 p-4">
            <form className="grid gap-3 md:grid-cols-4" method="get">
              <input name="q" defaultValue={sp.q ?? ""} placeholder="Search unit, property, town..." className="h-9 rounded-lg border px-3 text-sm md:col-span-2" />
              <select name="status" defaultValue={status} className="h-9 rounded-lg border px-3 text-sm">
                <option value="">All statuses</option>
                {OCCUPANCY_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <div className="flex gap-2">
                <select name="type" defaultValue={type} className="h-9 w-full rounded-lg border px-3 text-sm">
                  <option value="">All types</option>
                  {UNIT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <button type="submit" className="h-9 rounded-lg bg-danwell-navy px-3 text-sm font-medium text-white">Filter</button>
              </div>
            </form>

            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="bg-muted/30 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Unit</th>
                    <th className="px-3 py-2 font-medium">Property</th>
                    <th className="px-3 py-2 font-medium">Floor</th>
                    <th className="px-3 py-2 font-medium">Type</th>
                    <th className="px-3 py-2 font-medium">Rent</th>
                    <th className="px-3 py-2 font-medium">Occupancy</th>
                    <th className="px-3 py-2 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {units.map((unit) => (
                    <tr key={unit.id} className="border-t">
                      <td className="px-3 py-2 font-medium text-danwell-navy">{unit.unit_number}</td>
                      <td className="px-3 py-2">
                        <Link href={`/dashboard/properties/${unit.property_id}?tab=units`} className="hover:underline">{unit.property_title}</Link>
                        <div className="text-xs text-muted-foreground">{[unit.property_town, unit.property_county].filter(Boolean).join(", ")}</div>
                      </td>
                      <td className="px-3 py-2">{unit.floor || "—"}</td>
                      <td className="px-3 py-2">{labelFor(UNIT_TYPES, unit.unit_type)}</td>
                      <td className="px-3 py-2">KES {new Intl.NumberFormat("en-KE").format(unit.monthly_rent)}</td>
                      <td className="px-3 py-2"><StatusBadge label={labelFor(OCCUPANCY_STATUSES, unit.occupancy_status)} tone={unit.occupancy_status === "vacant" ? "positive" : unit.occupancy_status === "occupied" ? "warning" : "muted"} /></td>
                      <td className="px-3 py-2">
                        <Link href={`/dashboard/properties/${unit.property_id}/units/${unit.id}/edit`} className="rounded-lg border px-2.5 py-1 text-xs hover:bg-muted">Edit</Link>
                      </td>
                    </tr>
                  ))}
                  {units.length === 0 ? (
                    <tr><td colSpan={7} className="px-3 py-8 text-center text-sm text-muted-foreground">No units found.</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  });
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-white px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold text-danwell-navy">{value}</p>
    </div>
  );
}
