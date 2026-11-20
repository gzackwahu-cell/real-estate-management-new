import Link from "next/link";
import { FormField } from "@/components/portfolio/form-field";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  labelFor,
  MAINTENANCE_PRIORITIES,
  MAINTENANCE_STATUSES,
} from "@/lib/maintenance/constants";
import type { MaintenanceFilterOptions, MaintenanceFilters } from "@/lib/maintenance/queries";

type MaintenanceFiltersProps = {
  action: string;
  options: MaintenanceFilterOptions;
  values: MaintenanceFilters;
};

export function MaintenanceFiltersForm({
  action,
  options,
  values,
}: MaintenanceFiltersProps) {
  const hasFilters = Boolean(
    values.propertyId || values.unitId || values.status || values.priority || values.assignedTo,
  );

  return (
    <form action={action} method="get" className="rounded-xl border bg-white p-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
                {unit.property_title} · {unit.unit_number}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField name="status" label="Status">
          <Select id="status" name="status" defaultValue={values.status ?? ""}>
            <option value="">All statuses</option>
            {MAINTENANCE_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField name="priority" label="Priority">
          <Select id="priority" name="priority" defaultValue={values.priority ?? ""}>
            <option value="">All priorities</option>
            {MAINTENANCE_PRIORITIES.map((priority) => (
              <option key={priority.value} value={priority.value}>
                {priority.label}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField name="assignedTo" label="Assigned staff">
          <Select id="assignedTo" name="assignedTo" defaultValue={values.assignedTo ?? ""}>
            <option value="">Anyone</option>
            {options.staff.map((staff) => (
              <option key={staff.id} value={staff.id}>
                {staff.full_name || staff.email || "Staff member"}
              </option>
            ))}
          </Select>
        </FormField>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="submit">Apply filters</Button>
        {hasFilters ? (
          <Link
            href={action}
            className="inline-flex h-8 items-center rounded-lg border px-3 text-sm font-medium hover:bg-muted"
          >
            Clear
          </Link>
        ) : null}
      </div>
    </form>
  );
}

export function maintenanceFilterSummary(values: MaintenanceFilters): string {
  const parts: string[] = [];
  if (values.status) parts.push(labelFor(MAINTENANCE_STATUSES, values.status));
  if (values.priority) parts.push(labelFor(MAINTENANCE_PRIORITIES, values.priority));
  return parts.length > 0 ? parts.join(" · ") : "All requests";
}
