"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/portfolio/form-field";
import {
  LISTING_STATUSES,
  LISTING_TYPES,
  PRICE_PERIODS,
  PROPERTY_CATEGORIES,
} from "@/lib/listings/constants";
import {
  createListingAction,
  updateListingAction,
} from "@/lib/listings/staff-actions";
import type {
  PropertyOption,
  StaffListing,
  UnitOption,
} from "@/lib/listings/staff-queries";
import type { StaffFormState } from "@/lib/listings/validation";

type ListingFormProps = {
  listing?: StaffListing;
  properties: PropertyOption[];
  units: UnitOption[];
};

function CheckboxField({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label htmlFor={id} className="flex items-center gap-2 text-sm font-medium">
      <input
        id={id}
        name={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4 rounded border-input accent-danwell-teal"
      />
      {label}
    </label>
  );
}

export function ListingForm({ listing, properties, units }: ListingFormProps) {
  const action = listing
    ? updateListingAction.bind(null, listing.id)
    : createListingAction;
  const [state, formAction, pending] = useActionState<StaffFormState, FormData>(
    action,
    {},
  );
  const errors = state.fieldErrors ?? {};

  const [managed, setManaged] = useState(listing?.managed_by_agency ?? true);
  const [propertyId, setPropertyId] = useState(listing?.property_id ?? "");
  const [listingType, setListingType] = useState(listing?.listing_type ?? "rent");
  const [isFeatured, setIsFeatured] = useState(listing?.is_featured ?? false);

  const availableUnits = units.filter(
    (unit) => unit.property_id === propertyId,
  );

  return (
    <form action={formAction} className="space-y-7" noValidate>
      {state.error ? (
        <p role="alert" className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p role="status" className="rounded-lg border border-danwell-teal/25 bg-danwell-teal/10 px-3 py-2 text-sm text-danwell-teal">
          {state.success}
        </p>
      ) : null}

      <div className="grid gap-5 md:grid-cols-2">
        <FormField name="title" label="Listing title" error={errors.title} className="md:col-span-2">
          <Input id="title" name="title" defaultValue={listing?.title ?? ""} />
        </FormField>

        <FormField name="slug" label="URL slug" error={errors.slug} hint="Lowercase letters, numbers and hyphens. Leave blank to generate from the title.">
          <Input id="slug" name="slug" defaultValue={listing?.slug ?? ""} />
        </FormField>

        <FormField name="listingType" label="Listing type" error={errors.listingType}>
          <Select
            id="listingType"
            name="listingType"
            defaultValue={listingType}
            onChange={(event) => setListingType(event.target.value)}
          >
            {LISTING_TYPES.map((type) => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </Select>
        </FormField>

        <FormField name="propertyCategory" label="Property category" error={errors.propertyCategory}>
          <Select id="propertyCategory" name="propertyCategory" defaultValue={listing?.property_category ?? "house"}>
            {PROPERTY_CATEGORIES.map((category) => (
              <option key={category.value} value={category.value}>{category.label}</option>
            ))}
          </Select>
        </FormField>

        <FormField name="price" label="Price (KES)" error={errors.price}>
          <Input id="price" name="price" type="number" min="0" step="0.01" defaultValue={listing?.price ?? 0} />
        </FormField>

        <FormField name="pricePeriod" label="Price period" error={errors.pricePeriod}>
          <Select
            id="pricePeriod"
            name="pricePeriod"
            defaultValue={listing?.price_period ?? (listingType === "sale" ? "total" : "monthly")}
          >
            {PRICE_PERIODS.map((period) => (
              <option key={period.value} value={period.value}>{period.label}</option>
            ))}
          </Select>
        </FormField>

        <FormField name="bedrooms" label="Bedrooms" error={errors.bedrooms}>
          <Input id="bedrooms" name="bedrooms" type="number" min="0" max="50" defaultValue={listing?.bedrooms ?? ""} />
        </FormField>

        <FormField name="bathrooms" label="Bathrooms" error={errors.bathrooms}>
          <Input id="bathrooms" name="bathrooms" type="number" min="0" max="50" defaultValue={listing?.bathrooms ?? ""} />
        </FormField>

        <FormField name="county" label="County" error={errors.county}>
          <Input id="county" name="county" defaultValue={listing?.county ?? ""} />
        </FormField>

        <FormField name="town" label="Town" error={errors.town}>
          <Input id="town" name="town" defaultValue={listing?.town ?? ""} />
        </FormField>

        <FormField name="estate" label="Estate / neighbourhood" error={errors.estate}>
          <Input id="estate" name="estate" defaultValue={listing?.estate ?? ""} />
        </FormField>

        <FormField name="physicalAddress" label="Public address" error={errors.physicalAddress}>
          <Input id="physicalAddress" name="physicalAddress" defaultValue={listing?.physical_address ?? ""} />
        </FormField>

        <FormField name="description" label="Description" error={errors.description} className="md:col-span-2">
          <Textarea id="description" name="description" rows={6} defaultValue={listing?.description ?? ""} />
        </FormField>

        <FormField name="features" label="Features" error={errors.features} hint="Separate features with commas or new lines." className="md:col-span-2">
          <Textarea id="features" name="features" rows={3} defaultValue={listing?.features.join(", ") ?? ""} />
        </FormField>
      </div>

      <fieldset className="rounded-xl border border-danwell-navy/10 p-4">
        <legend className="px-1 text-sm font-semibold text-danwell-navy">Portfolio link</legend>
        <div className="space-y-4">
          <CheckboxField
            id="managedByAgency"
            label="Managed by Danwell (link a registered property)"
            checked={managed}
            onChange={setManaged}
          />
          {errors.managedByAgency ? (
            <p role="alert" className="text-xs text-destructive">{errors.managedByAgency}</p>
          ) : null}

          {managed ? (
            <div className="grid gap-4 md:grid-cols-2">
              <FormField name="propertyId" label="Registered property" error={errors.propertyId}>
                <Select
                  id="propertyId"
                  name="propertyId"
                  value={propertyId}
                  onChange={(event) => setPropertyId(event.target.value)}
                >
                  <option value="">Select a property</option>
                  {properties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.title} — {property.town}, {property.county}
                    </option>
                  ))}
                </Select>
              </FormField>

              <FormField name="unitId" label="Unit (optional)" error={errors.unitId}>
                <Select id="unitId" name="unitId" defaultValue={listing?.unit_id ?? ""}>
                  <option value="">Whole property</option>
                  {availableUnits.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.unit_number} ({unit.unit_type})
                    </option>
                  ))}
                </Select>
              </FormField>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Marketed-only listings store public marketing details only and do
              not link to tenant, owner or financial records.
            </p>
          )}
        </div>
      </fieldset>

      <fieldset className="rounded-xl border border-danwell-navy/10 p-4">
        <legend className="px-1 text-sm font-semibold text-danwell-navy">Publication</legend>
        <div className="grid gap-5 md:grid-cols-3">
          <FormField name="status" label="Listing status" error={errors.status}>
            <Select id="status" name="status" defaultValue={listing?.status ?? "draft"}>
              {LISTING_STATUSES.map((status) => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </Select>
          </FormField>
          <div className="flex flex-col gap-3 pt-6">
            <CheckboxField id="isFeatured" label="Feature on homepage" checked={isFeatured} onChange={setIsFeatured} />
            <p className="text-xs text-muted-foreground">
              Publication is controlled separately from the listings table.
            </p>
          </div>
        </div>
      </fieldset>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={pending} className="bg-danwell-navy text-white hover:bg-danwell-teal">
          {pending ? "Saving..." : listing ? "Save listing" : "Create listing"}
        </Button>
      </div>
    </form>
  );
}
