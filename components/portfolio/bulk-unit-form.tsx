"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { bulkCreateUnitsAction } from "@/lib/portfolio/actions";
import { OCCUPANCY_STATUSES, RENT_PERIODS, UNIT_TYPES } from "@/lib/portfolio/constants";
import type { PortfolioFormState } from "@/lib/portfolio/validation";
import { FormField } from "./form-field";

const initialState: PortfolioFormState = {};

export function BulkUnitForm({ propertyId }: { propertyId: string }) {
  const action = bulkCreateUnitsAction.bind(null, propertyId);
  const [state, formAction, pending] = useActionState<PortfolioFormState, FormData>(action, initialState);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state.error ? (
        <p role="alert" className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>
      ) : null}
      {state.success ? (
        <p role="status" className="rounded-lg border border-emerald-600/20 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{state.success}</p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <FormField name="prefix" label="Prefix" error={errors.prefix}>
          <Input id="prefix" name="prefix" placeholder="e.g. A-" />
        </FormField>
        <FormField name="startNumber" label="Start number" error={errors.startNumber}>
          <Input id="startNumber" name="startNumber" type="number" min="0" defaultValue="1" />
        </FormField>
        <FormField name="count" label="Number of units" error={errors.count}>
          <Input id="count" name="count" type="number" min="1" max="200" defaultValue="10" />
        </FormField>
        <FormField name="floor" label="Floor / level" error={errors.floor}>
          <Input id="floor" name="floor" placeholder="e.g. 1st" />
        </FormField>

        <FormField name="unitType" label="Unit type" error={errors.unitType}>
          <Select id="unitType" name="unitType" defaultValue="apartment">
            {UNIT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </Select>
        </FormField>
        <FormField name="occupancyStatus" label="Occupancy" error={errors.occupancyStatus}>
          <Select id="occupancyStatus" name="occupancyStatus" defaultValue="vacant">
            {OCCUPANCY_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </Select>
        </FormField>
        <FormField name="monthlyRent" label="Rent (KES)" error={errors.monthlyRent}>
          <Input id="monthlyRent" name="monthlyRent" type="number" min="0" step="0.01" defaultValue="0" />
        </FormField>
        <FormField name="rentPeriod" label="Rent period" error={errors.rentPeriod}>
          <Select id="rentPeriod" name="rentPeriod" defaultValue="monthly">
            {RENT_PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </Select>
        </FormField>

        <FormField name="depositAmount" label="Deposit (KES)" error={errors.depositAmount}>
          <Input id="depositAmount" name="depositAmount" type="number" min="0" step="0.01" />
        </FormField>
        <FormField name="bedrooms" label="Bedrooms" error={errors.bedrooms}>
          <Input id="bedrooms" name="bedrooms" type="number" min="0" />
        </FormField>
        <FormField name="bathrooms" label="Bathrooms" error={errors.bathrooms}>
          <Input id="bathrooms" name="bathrooms" type="number" min="0" />
        </FormField>
        <FormField name="areaSqm" label="Area (sqm)" error={errors.areaSqm}>
          <Input id="areaSqm" name="areaSqm" type="number" min="0" step="0.01" />
        </FormField>

        <FormField name="amenities" label="Amenities" error={errors.amenities} className="sm:col-span-2">
          <Textarea id="amenities" name="amenities" placeholder="Comma-separated" />
        </FormField>
        <FormField name="publicNotes" label="Public notes" error={errors.publicNotes} className="sm:col-span-2">
          <Textarea id="publicNotes" name="publicNotes" />
        </FormField>
        <FormField name="notes" label="Internal notes" error={errors.notes} className="sm:col-span-2 lg:col-span-4">
          <Textarea id="notes" name="notes" />
        </FormField>
      </div>

      <div className="flex flex-wrap gap-6 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" name="depositRequired" defaultChecked className="size-4 rounded border-input accent-[var(--color-danwell-teal)]" />Deposit required</label>
        <label className="flex items-center gap-2"><input type="checkbox" name="isActive" defaultChecked className="size-4 rounded border-input accent-[var(--color-danwell-teal)]" />Active</label>
        <label className="flex items-center gap-2"><input type="checkbox" name="isListable" defaultChecked className="size-4 rounded border-input accent-[var(--color-danwell-teal)]" />Listable on public listings</label>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>{pending ? "Creating..." : "Generate units"}</Button>
      </div>
    </form>
  );
}
