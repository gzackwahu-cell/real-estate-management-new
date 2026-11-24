"use client";

import { useActionState, useState } from "react";
import { FormField } from "@/components/portfolio/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createApplicationAction } from "@/lib/tenancy/actions";
import type { TenancyFormState, UnitOption } from "@/lib/tenancy/validation";

const initialState: TenancyFormState = {};

type ApplicationFormProps = {
  units: UnitOption[];
  defaultDate: string;
};

export function ApplicationForm({ units, defaultDate }: ApplicationFormProps) {
  const [state, formAction, pending] = useActionState<TenancyFormState, FormData>(
    createApplicationAction,
    initialState,
  );
  const errors = state.fieldErrors ?? {};
  const [unitId, setUnitId] = useState(units[0]?.id ?? "");
  const selectedUnit = units.find((unit) => unit.id === unitId);
  const [proposedRent, setProposedRent] = useState(
    selectedUnit ? String(selectedUnit.monthly_rent) : "0",
  );

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

      {units.length === 0 ? (
        <p className="rounded-lg border border-amber-600/20 bg-amber-600/10 px-3 py-2 text-sm text-amber-800">
          No active vacant or reserved units are available for a new application.
        </p>
      ) : null}

      <div className="grid gap-5 md:grid-cols-2">
        <FormField
          name="unitId"
          label="Preferred unit"
          error={errors.unitId}
          className="md:col-span-2"
        >
          <Select
            id="unitId"
            name="unitId"
            value={unitId}
            onChange={(event) => {
              const nextId = event.target.value;
              setUnitId(nextId);
              const nextUnit = units.find((unit) => unit.id === nextId);
              if (nextUnit) {
                setProposedRent(String(nextUnit.monthly_rent));
              }
            }}
            aria-invalid={Boolean(errors.unitId)}
          >
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.unit_number} · {unit.property_title}{unit.floor ? ` · ${unit.floor}` : ""}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField
          name="applicantFullName"
          label="Applicant full name"
          error={errors.applicantFullName}
        >
          <Input
            id="applicantFullName"
            name="applicantFullName"
            autoComplete="name"
            aria-invalid={Boolean(errors.applicantFullName)}
          />
        </FormField>

        <FormField
          name="applicantPhone"
          label="Applicant phone"
          error={errors.applicantPhone}
        >
          <Input
            id="applicantPhone"
            name="applicantPhone"
            type="tel"
            autoComplete="tel"
            aria-invalid={Boolean(errors.applicantPhone)}
          />
        </FormField>

        <FormField
          name="applicantEmail"
          label="Applicant email"
          error={errors.applicantEmail}
        >
          <Input
            id="applicantEmail"
            name="applicantEmail"
            type="email"
            autoComplete="email"
            aria-invalid={Boolean(errors.applicantEmail)}
          />
        </FormField>

        <FormField
          name="applicantIdReference"
          label="National ID / reference"
          error={errors.applicantIdReference}
        >
          <Input
            id="applicantIdReference"
            name="applicantIdReference"
            aria-invalid={Boolean(errors.applicantIdReference)}
          />
        </FormField>

        <FormField
          name="applicantAddress"
          label="Applicant address"
          error={errors.applicantAddress}
          className="md:col-span-2"
        >
          <Input
            id="applicantAddress"
            name="applicantAddress"
            autoComplete="street-address"
            aria-invalid={Boolean(errors.applicantAddress)}
          />
        </FormField>

        <FormField
          name="proposedRent"
          label="Proposed monthly rent (KES)"
          error={errors.proposedRent}
        >
          <Input
            id="proposedRent"
            name="proposedRent"
            type="number"
            min="0"
            step="0.01"
            value={proposedRent}
            onChange={(event) => setProposedRent(event.target.value)}
            aria-invalid={Boolean(errors.proposedRent)}
          />
        </FormField>

        <FormField
          name="applicationDate"
          label="Application date"
          error={errors.applicationDate}
        >
          <Input
            id="applicationDate"
            name="applicationDate"
            type="date"
            defaultValue={defaultDate}
            aria-invalid={Boolean(errors.applicationDate)}
          />
        </FormField>

        <FormField
          name="notes"
          label="Notes"
          error={errors.notes}
          className="md:col-span-2"
        >
          <Textarea id="notes" name="notes" aria-invalid={Boolean(errors.notes)} />
        </FormField>
      </div>

      <p className="text-xs text-muted-foreground">
        Approving an application creates or links a tenant record only. A lease is
        always created separately.
      </p>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending || units.length === 0}>
          {pending ? "Submitting..." : "Submit application"}
        </Button>
      </div>
    </form>
  );
}
