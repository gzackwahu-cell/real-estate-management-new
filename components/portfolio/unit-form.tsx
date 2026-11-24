"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createUnitAction, updateUnitAction } from "@/lib/portfolio/actions";
import { OCCUPANCY_STATUSES, RENT_PERIODS, UNIT_TYPES } from "@/lib/portfolio/constants";
import type { PortfolioFormState, UnitRecord } from "@/lib/portfolio/validation";
import { FormField } from "./form-field";

const initialState: PortfolioFormState = {};

type UnitFormProps = {
  propertyId: string;
  unit?: UnitRecord;
};

export function UnitForm({ propertyId, unit }: UnitFormProps) {
  const action = unit
    ? updateUnitAction.bind(null, propertyId, unit.id)
    : createUnitAction.bind(null, propertyId);
  const [state, formAction, pending] = useActionState<PortfolioFormState, FormData>(
    action,
    initialState,
  );
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state.error ? (
        <p role="alert" className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <FormField name="unitNumber" label="Unit number / name" error={errors.unitNumber}>
          <Input id="unitNumber" name="unitNumber" defaultValue={unit?.unit_number ?? ""} aria-invalid={Boolean(errors.unitNumber)} />
        </FormField>

        <FormField name="unitType" label="Unit type" error={errors.unitType}>
          <Select id="unitType" name="unitType" defaultValue={unit?.unit_type ?? "apartment"}>
            {UNIT_TYPES.map((type) => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </Select>
        </FormField>

        <FormField name="floor" label="Floor / level" error={errors.floor}>
          <Input id="floor" name="floor" defaultValue={unit?.floor ?? ""} placeholder="e.g. Ground, 1st, 2nd" aria-invalid={Boolean(errors.floor)} />
        </FormField>

        <FormField name="bedrooms" label="Bedrooms" error={errors.bedrooms}>
          <Input id="bedrooms" name="bedrooms" type="number" min="0" step="1" defaultValue={unit?.bedrooms ?? ""} />
        </FormField>

        <FormField name="bathrooms" label="Bathrooms" error={errors.bathrooms}>
          <Input id="bathrooms" name="bathrooms" type="number" min="0" step="1" defaultValue={unit?.bathrooms ?? ""} />
        </FormField>

        <FormField name="areaSqm" label="Area (sqm)" error={errors.areaSqm}>
          <Input id="areaSqm" name="areaSqm" type="number" min="0" step="0.01" defaultValue={unit?.area_sqm ?? ""} />
        </FormField>

        <FormField name="monthlyRent" label="Rent amount (KES)" error={errors.monthlyRent}>
          <Input id="monthlyRent" name="monthlyRent" type="number" min="0" step="0.01" defaultValue={unit ? String(unit.monthly_rent) : "0"} aria-invalid={Boolean(errors.monthlyRent)} />
        </FormField>

        <FormField name="rentPeriod" label="Rent period" error={errors.rentPeriod}>
          <Select id="rentPeriod" name="rentPeriod" defaultValue={unit?.rent_period ?? "monthly"}>
            {RENT_PERIODS.map((period) => (
              <option key={period.value} value={period.value}>{period.label}</option>
            ))}
          </Select>
        </FormField>

        <FormField name="depositAmount" label="Deposit amount (KES)" error={errors.depositAmount}>
          <Input id="depositAmount" name="depositAmount" type="number" min="0" step="0.01" defaultValue={unit?.deposit_amount ?? ""} />
        </FormField>

        <FormField name="occupancyStatus" label="Occupancy status" error={errors.occupancyStatus}>
          <Select id="occupancyStatus" name="occupancyStatus" defaultValue={unit?.occupancy_status ?? "vacant"}>
            {OCCUPANCY_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>{status.label}</option>
            ))}
          </Select>
        </FormField>

        <FormField name="sortOrder" label="Sort order" error={errors.sortOrder}>
          <Input id="sortOrder" name="sortOrder" type="number" min="0" step="1" defaultValue={unit?.sort_order ?? 0} />
        </FormField>

        <FormField name="amenities" label="Amenities" error={errors.amenities} className="md:col-span-2 xl:col-span-3">
          <Textarea id="amenities" name="amenities" defaultValue={(unit?.amenities ?? []).join(", ")} placeholder="Comma-separated, e.g. Balcony, Parking, Wi-Fi" />
        </FormField>

        <FormField name="publicNotes" label="Public notes" error={errors.publicNotes} className="md:col-span-2 xl:col-span-3">
          <Textarea id="publicNotes" name="publicNotes" defaultValue={unit?.public_notes ?? ""} placeholder="Shown on public listings where appropriate." />
        </FormField>

        <FormField name="notes" label="Internal notes" error={errors.notes} className="md:col-span-2 xl:col-span-3">
          <Textarea id="notes" name="notes" defaultValue={unit?.notes ?? ""} placeholder="Internal management notes." />
        </FormField>
      </div>

      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" name="depositRequired" defaultChecked={unit ? unit.deposit_required : true} className="size-4 rounded border-input accent-[var(--color-danwell-teal)]" />
          Deposit required
        </label>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" name="isActive" defaultChecked={unit ? unit.is_active : true} className="size-4 rounded border-input accent-[var(--color-danwell-teal)]" />
          Unit is active
        </label>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" name="isListable" defaultChecked={unit ? unit.is_listable : true} className="size-4 rounded border-input accent-[var(--color-danwell-teal)]" />
          Show on public listings
        </label>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : unit ? "Save unit" : "Add unit"}
        </Button>
      </div>
    </form>
  );
}
