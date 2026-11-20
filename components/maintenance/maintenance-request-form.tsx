"use client";

import { useActionState, useState } from "react";
import { FormField } from "@/components/portfolio/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createMaintenanceRequestAction } from "@/lib/maintenance/actions";
import {
  currentDate,
  labelFor,
  MAINTENANCE_CATEGORIES,
  MAINTENANCE_PRIORITIES,
} from "@/lib/maintenance/constants";
import type { MaintenanceFormState } from "@/lib/maintenance/validation";

const initialState: MaintenanceFormState = {};

type Option = { id: string; label: string };
type UnitOption = Option & { propertyId: string };

type MaintenanceRequestFormProps = {
  properties: Option[];
  units: UnitOption[];
  tenants: Option[];
  fixedProperty?: { id: string; label: string };
  fixedTenant?: { id: string; label: string };
  fixedTenantContact?: string;
  portal?: boolean;
};

export function MaintenanceRequestForm({
  properties,
  units,
  tenants,
  fixedProperty,
  fixedTenant,
  fixedTenantContact,
  portal = false,
}: MaintenanceRequestFormProps) {
  const [state, formAction, pending] = useActionState(
    createMaintenanceRequestAction,
    initialState,
  );
  const [selectedProperty, setSelectedProperty] = useState(
    fixedProperty?.id ?? properties[0]?.id ?? "",
  );
  const visibleUnits = units.filter((unit) => unit.propertyId === selectedProperty);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="portal" value={portal ? "tenant" : "staff"} />
      {fixedProperty ? (
        <input type="hidden" name="propertyId" value={fixedProperty.id} />
      ) : null}
      {fixedTenant ? <input type="hidden" name="tenantId" value={fixedTenant.id} /> : null}

      {state.error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        {fixedProperty ? (
          <FormField name="propertyLabel" label="Property">
            <Input id="propertyLabel" value={fixedProperty.label} readOnly />
          </FormField>
        ) : (
          <FormField name="propertyId" label="Property" error={state.fieldErrors?.propertyId}>
            <Select
              id="propertyId"
              name="propertyId"
              required
              value={selectedProperty}
              onChange={(event) => setSelectedProperty(event.target.value)}
            >
              <option value="">Select a property</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.label}
                </option>
              ))}
            </Select>
          </FormField>
        )}

        <FormField name="unitId" label="Unit (optional)" error={state.fieldErrors?.unitId}>
          <Select
            key={selectedProperty}
            id="unitId"
            name="unitId"
            defaultValue=""
          >
            <option value="">Property-level issue</option>
            {visibleUnits.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.label}
              </option>
            ))}
          </Select>
        </FormField>
      </div>

      {!portal && !fixedTenant ? (
        <FormField name="tenantId" label="Tenant (optional)" error={state.fieldErrors?.tenantId}>
          <Select id="tenantId" name="tenantId" defaultValue="">
            <option value="">No tenant linked</option>
            {tenants.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>
                {tenant.label}
              </option>
            ))}
          </Select>
        </FormField>
      ) : null}

      {fixedTenant ? (
        <FormField name="tenantLabel" label="Reported for">
          <Input id="tenantLabel" value={fixedTenant.label} readOnly />
        </FormField>
      ) : null}

      <FormField name="title" label="Title" error={state.fieldErrors?.title}>
        <Input
          id="title"
          name="title"
          required
          maxLength={160}
          placeholder="e.g. Kitchen tap leaking"
        />
      </FormField>

      <FormField
        name="description"
        label="Description"
        error={state.fieldErrors?.description}
        hint="Describe what is happening, where it is and any access notes."
      >
        <Textarea id="description" name="description" required maxLength={4000} />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField name="category" label="Category" error={state.fieldErrors?.category}>
          <Select id="category" name="category" defaultValue="plumbing" required>
            {MAINTENANCE_CATEGORIES.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField name="priority" label="Priority" error={state.fieldErrors?.priority}>
          <Select id="priority" name="priority" defaultValue="normal" required>
            {MAINTENANCE_PRIORITIES.map((priority) => (
              <option key={priority.value} value={priority.value}>
                {priority.label}
              </option>
            ))}
          </Select>
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField name="reportedDate" label="Date reported" error={state.fieldErrors?.reportedDate}>
          <Input
            id="reportedDate"
            name="reportedDate"
            type="date"
            required
            defaultValue={currentDate()}
          />
        </FormField>

        <FormField
          name="tenantContact"
          label="Tenant contact"
          error={state.fieldErrors?.tenantContact}
          hint="Optional. Defaults to the linked tenant's phone or email."
        >
          <Input
            id="tenantContact"
            name="tenantContact"
            maxLength={160}
            defaultValue={fixedTenantContact ?? ""}
            placeholder="Phone or email"
          />
        </FormField>
      </div>

      <FormField name="notes" label="Internal notes" error={state.fieldErrors?.notes}>
        <Textarea id="notes" name="notes" maxLength={1000} />
      </FormField>

      <Button type="submit" disabled={pending}>
        {pending ? "Submitting..." : portal ? "Submit request" : "Register request"}
      </Button>
    </form>
  );
}

export function maintenanceCategoryLabel(value: string): string {
  return labelFor(MAINTENANCE_CATEGORIES, value);
}
