import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatPeriod } from "@/lib/finance/constants";
import type { ReportFilters } from "@/lib/reports/queries";

export function ReportFiltersForm({
  filters,
  propertyOptions,
}: {
  filters: ReportFilters;
  propertyOptions: readonly { id: string; title: string }[];
}) {
  const hasFilters = Boolean(filters.period || filters.propertyId);

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-sm text-danwell-navy">Report filters</CardTitle>
        <CardDescription>
          Period applies to finance figures. Property narrows every section that supports it.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action="/dashboard/reports" method="get" className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-36 flex-1 flex-col gap-1 text-xs text-muted-foreground">
            Period
            <input
              type="month"
              name="period"
              defaultValue={filters.period ?? ""}
              className="h-8 rounded-lg border bg-background px-2 text-sm text-foreground"
            />
          </label>
          <label className="flex min-w-52 flex-1 flex-col gap-1 text-xs text-muted-foreground">
            Property
            <select
              name="propertyId"
              defaultValue={filters.propertyId ?? ""}
              className="h-8 rounded-lg border bg-background px-2 text-sm text-foreground"
              disabled={propertyOptions.length === 0}
            >
              <option value="">All properties</option>
              {propertyOptions.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.title}
                </option>
              ))}
            </select>
          </label>
          <Button type="submit" size="sm">
            Apply
          </Button>
          {hasFilters ? (
            <Button type="button" size="sm" variant="ghost" asChild>
              <Link href="/dashboard/reports">Reset</Link>
            </Button>
          ) : null}
        </form>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Showing {formatPeriod(filters.period)}
          {filters.propertyId ? " · one selected property" : " · all properties"}
        </p>
      </CardContent>
    </Card>
  );
}
