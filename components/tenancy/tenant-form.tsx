"use client";

import { useActionState } from "react";
import { FormField } from "@/components/portfolio/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { createTenantAction, updateTenantAction } from "@/lib/tenancy/actions";
import { TENANT_STATUSES } from "@/lib/tenancy/constants";
import type { TenantRecord, TenancyFormState } from "@/lib/tenancy/validation";

const initialState: TenancyFormState = {};

type TenantFormProps = {
  tenant?: TenantRecord;
};

export function TenantForm({ tenant }: TenantFormProps) {
  const action = tenant
    ? updateTenantAction.bind(null, tenant.id)
    : createTenantAction;
  const [state, formAction, pending] = useActionState<TenancyFormState, FormData>(
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
        <FormField name="fullName" label="Full name" error={errors.fullName}>
          <Input
            id="fullName"
            name="fullName"
            defaultValue={tenant?.full_name ?? ""}
            autoComplete="name"
            aria-invalid={Boolean(errors.fullName)}
          />
        </FormField>

        <FormField name="phone" label="Phone" error={errors.phone}>
          <Input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={tenant?.phone ?? ""}
            autoComplete="tel"
            aria-invalid={Boolean(errors.phone)}
          />
        </FormField>

        <FormField name="email" label="Email" error={errors.email}>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={tenant?.email ?? ""}
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
          />
        </FormField>

        <FormField
          name="idReference"
          label="National ID / reference"
          error={errors.idReference}
        >
          <Input
            id="idReference"
            name="idReference"
            defaultValue={tenant?.id_reference ?? ""}
            aria-invalid={Boolean(errors.idReference)}
          />
        </FormField>

        <FormField
          name="address"
          label="Address"
          error={errors.address}
          className="md:col-span-2"
        >
          <Input
            id="address"
            name="address"
            defaultValue={tenant?.address ?? ""}
            autoComplete="street-address"
            aria-invalid={Boolean(errors.address)}
          />
        </FormField>

        <FormField
          name="emergencyContactName"
          label="Emergency contact name"
          error={errors.emergencyContactName}
        >
          <Input
            id="emergencyContactName"
            name="emergencyContactName"
            defaultValue={tenant?.emergency_contact_name ?? ""}
            aria-invalid={Boolean(errors.emergencyContactName)}
          />
        </FormField>

        <FormField
          name="emergencyContactPhone"
          label="Emergency contact phone"
          error={errors.emergencyContactPhone}
        >
          <Input
            id="emergencyContactPhone"
            name="emergencyContactPhone"
            type="tel"
            defaultValue={tenant?.emergency_contact_phone ?? ""}
            aria-invalid={Boolean(errors.emergencyContactPhone)}
          />
        </FormField>

        <FormField name="status" label="Status" error={errors.status}>
          <Select
            id="status"
            name="status"
            defaultValue={tenant?.status ?? "active"}
          >
            {TENANT_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </Select>
        </FormField>
      </div>

      <p className="text-xs text-muted-foreground">
        Tenant records are private. Use archived status to retain history instead
        of deleting personal data.
      </p>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : tenant ? "Save tenant" : "Register tenant"}
        </Button>
      </div>
    </form>
  );
}
