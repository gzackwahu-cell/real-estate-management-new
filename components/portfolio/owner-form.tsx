"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createOwnerAction,
  updateOwnerAction,
} from "@/lib/portfolio/actions";
import type { OwnerRecord, PortfolioFormState } from "@/lib/portfolio/validation";
import { FormField } from "./form-field";

const initialState: PortfolioFormState = {};

type OwnerFormProps = {
  owner?: OwnerRecord;
};

export function OwnerForm({ owner }: OwnerFormProps) {
  const action = owner
    ? updateOwnerAction.bind(null, owner.id)
    : createOwnerAction;
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
        <FormField name="fullName" label="Full name" error={errors.fullName}>
          <Input
            id="fullName"
            name="fullName"
            defaultValue={owner?.full_name ?? ""}
            autoComplete="name"
            aria-invalid={Boolean(errors.fullName)}
          />
        </FormField>

        <FormField name="phone" label="Phone" error={errors.phone}>
          <Input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={owner?.phone ?? ""}
            autoComplete="tel"
            aria-invalid={Boolean(errors.phone)}
          />
        </FormField>

        <FormField name="email" label="Email" error={errors.email}>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={owner?.email ?? ""}
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
          />
        </FormField>

        <FormField
          name="idReference"
          label="ID / reference number"
          error={errors.idReference}
        >
          <Input
            id="idReference"
            name="idReference"
            defaultValue={owner?.id_reference ?? ""}
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
            defaultValue={owner?.address ?? ""}
            autoComplete="street-address"
            aria-invalid={Boolean(errors.address)}
          />
        </FormField>
      </div>

      <label className="flex items-center gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={owner ? owner.is_active : true}
          className="size-4 rounded border-input accent-[var(--color-danwell-teal)]"
        />
        Owner record is active
      </label>

      <div className="flex justify-end gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : owner ? "Save owner" : "Register owner"}
        </Button>
      </div>
    </form>
  );
}
