import Link from "next/link";
import { FormField } from "@/components/portfolio/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { FinanceFilterOptions } from "@/lib/finance/queries";

type FinanceFiltersProps = {
  action: string;
  options: FinanceFilterOptions;
  values: {
    period?: string;
    propertyId?: string;
    unitId?: string;
    tenantId?: string;
  };
};

export function FinanceFilters({ action, options, values }: FinanceFiltersProps) {
  const hasFilters = Boolean(
    values.period || values.propertyId || values.unitId || values.tenantId,
  );

  return (
    <form action={action} method="get" className="rounded-xl border bg-white p-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <FormField name="period" label="Period">
          <Input id="period" name="period" type="month" defaultValue={values.period ?? ""} />
        </FormField>

        <FormField name="propertyId" label="Property">
          <Select id="propertyId" name="propertyId" defaultValue={values.propertyId ?? ""}>
            <option value="">All properties</option>
            {options.properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.title}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField name="unitId" label="Unit">
          <Select id="unitId" name="unitId" defaultValue={values.unitId ?? ""}>
            <option value="">All units</option>
            {options.units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.unit_number} · {unit.property_title}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField name="tenantId" label="Tenant">
          <Select id="tenantId" name="tenantId" defaultValue={values.tenantId ?? ""}>
            <option value="">All tenants</option>
            {options.tenants.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>
                {tenant.full_name}
              </option>
            ))}
          </Select>
        </FormField>

        <div className="flex items-end gap-2">
          <Button type="submit">Apply filters</Button>
          {hasFilters ? (
            <Button asChild variant="outline">
              <Link href={action}>Clear</Link>
            </Button>
          ) : null}
        </div>
      </div>
    </form>
  );
}
