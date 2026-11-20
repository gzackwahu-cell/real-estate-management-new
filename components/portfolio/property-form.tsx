"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  createPropertyAction,
  updatePropertyAction,
} from "@/lib/portfolio/actions";
import {
  PROPERTY_STATUSES,
  PROPERTY_TYPES,
} from "@/lib/portfolio/constants";
import type {
  OwnerOption,
  PortfolioFormState,
  PropertyOwnerRecord,
  PropertyRecord,
} from "@/lib/portfolio/validation";
import { FormField } from "./form-field";
import { OwnerAssignmentFields } from "./owner-assignment-fields";

const initialState: PortfolioFormState = {};

type PropertyFormProps = {
  owners: OwnerOption[];
  property?: PropertyRecord;
  assignments?: PropertyOwnerRecord[];
};

export function PropertyForm({
  owners,
  property,
  assignments,
}: PropertyFormProps) {
  const action = property
    ? updatePropertyAction.bind(null, property.id)
    : createPropertyAction;
  const [state, formAction, pending] = useActionState<PortfolioFormState, FormData>(
    action,
    initialState,
  );
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-6" noValidate>
      {state.error ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {state.error}
        </p>
      ) : null}

      <div className="grid gap-5 md:grid-cols-2">
        <FormField
          name="title"
          label="Property title"
          error={errors.title}
          className="md:col-span-2"
        >
          <Input
            id="title"
            name="title"
            defaultValue={property?.title ?? ""}
            aria-invalid={Boolean(errors.title)}
          />
        </FormField>

        <FormField
          name="description"
          label="Description"
          error={errors.description}
          className="md:col-span-2"
        >
          <Textarea
            id="description"
            name="description"
            defaultValue={property?.description ?? ""}
            aria-invalid={Boolean(errors.description)}
          />
        </FormField>

        <FormField name="propertyType" label="Property type" error={errors.propertyType}>
          <Select
            id="propertyType"
            name="propertyType"
            defaultValue={property?.property_type ?? "residential"}
          >
            {PROPERTY_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField name="status" label="Status" error={errors.status}>
          <Select
            id="status"
            name="status"
            defaultValue={property?.status ?? "draft"}
          >
            {PROPERTY_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField name="county" label="County" error={errors.county}>
          <Input
            id="county"
            name="county"
            defaultValue={property?.county ?? ""}
            aria-invalid={Boolean(errors.county)}
          />
        </FormField>

        <FormField name="town" label="Town" error={errors.town}>
          <Input
            id="town"
            name="town"
            defaultValue={property?.town ?? ""}
            aria-invalid={Boolean(errors.town)}
          />
        </FormField>

        <FormField name="estate" label="Estate / neighbourhood" error={errors.estate}>
          <Input
            id="estate"
            name="estate"
            defaultValue={property?.estate ?? ""}
            aria-invalid={Boolean(errors.estate)}
          />
        </FormField>

        <FormField
          name="physicalAddress"
          label="Physical address"
          error={errors.physicalAddress}
        >
          <Input
            id="physicalAddress"
            name="physicalAddress"
            defaultValue={property?.physical_address ?? ""}
            aria-invalid={Boolean(errors.physicalAddress)}
          />
        </FormField>

        <FormField
          name="directions"
          label="Directions"
          error={errors.directions}
          className="md:col-span-2"
        >
          <Textarea
            id="directions"
            name="directions"
            defaultValue={property?.directions ?? ""}
            aria-invalid={Boolean(errors.directions)}
          />
        </FormField>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-danwell-navy">Ownership</p>
        {owners.length === 0 ? (
          <p className="rounded-lg border border-amber-600/20 bg-amber-600/10 px-3 py-2 text-sm text-amber-800">
            Register at least one owner before creating a property.
          </p>
        ) : (
          <OwnerAssignmentFields
            owners={owners}
            initialAssignments={assignments}
            error={errors.owners}
          />
        )}
      </div>

      <div className="flex justify-end gap-3">
        <Button type="submit" disabled={pending || owners.length === 0}>
          {pending ? "Saving..." : property ? "Save property" : "Register property"}
        </Button>
      </div>
    </form>
  );
}
