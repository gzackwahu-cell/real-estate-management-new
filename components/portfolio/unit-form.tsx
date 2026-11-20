"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createUnitAction, updateUnitAction } from "@/lib/portfolio/actions";
import { OCCUPANCY_STATUSES, UNIT_TYPES } from "@/lib/portfolio/constants";
import type {
  PortfolioFormState,
  UnitRecord,
} from "@/lib/portfolio/validation";
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
        <p
          role="alert"
          className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {state.error}
        </p>
      ) : null}

      <div className="grid gap-5 md:grid-cols-2">
        <FormField name="unitNumber" label="Unit number / name" error={errors.unitNumber}>
          <Input
            id="unitNumber"
            name="unitNumber"
            defaultValue={unit?.unit_number ?? ""}
            aria-invalid={Boolean(errors.unitNumber)}
          />
        </FormField>

        <FormField name="unitType" label="Unit type" error={errors.unitType}>
          <Select
            id="unitType"
            name="unitType"
            defaultValue={unit?.unit_type ?? "bedsitter"}
          >
            {UNIT_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField name="monthlyRent" label="Monthly rent (KES)" error={errors.monthlyRent}>
          <Input
            id="monthlyRent"
            name="monthlyRent"
            type="number"
            min="0"
            step="0.01"
            defaultValue={unit ? String(unit.monthly_rent) : "0"}
            aria-invalid={Boolean(errors.monthlyRent)}
          />
        </FormField>

        <FormField
          name="occupancyStatus"
          label="Occupancy status"
          error={errors.occupancyStatus}
        >
          <Select
            id="occupancyStatus"
            name="occupancyStatus"
            defaultValue={unit?.occupancy_status ?? "vacant"}
          >
            {OCCUPANCY_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField
          name="notes"
          label="Notes"
          error={errors.notes}
          className="md:col-span-2"
        >
          <Textarea
            id="notes"
            name="notes"
            defaultValue={unit?.notes ?? ""}
            aria-invalid={Boolean(errors.notes)}
          />
        </FormField>
      </div>

      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            name="depositRequired"
            defaultChecked={unit ? unit.deposit_required : true}
            className="size-4 rounded border-input accent-[var(--color-danwell-teal)]"
          />
          Deposit required
        </label>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={unit ? unit.is_active : true}
            className="size-4 rounded border-input accent-[var(--color-danwell-teal)]"
          />
          Unit is active
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
