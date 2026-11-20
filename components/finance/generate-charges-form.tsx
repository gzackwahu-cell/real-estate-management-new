"use client";

import { useActionState } from "react";
import { FormField } from "@/components/portfolio/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { generateRentChargesAction } from "@/lib/finance/actions";
import { currentPeriod } from "@/lib/finance/constants";
import type { FinanceFormState } from "@/lib/finance/validation";

const initialState: FinanceFormState = {};

type GenerateChargesFormProps = {
  defaultPeriod?: string;
};

export function GenerateChargesForm({ defaultPeriod }: GenerateChargesFormProps) {
  const [state, formAction, pending] = useActionState<FinanceFormState, FormData>(
    generateRentChargesAction,
    initialState,
  );
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-5">
      {state.error ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p
          role="status"
          className="rounded-lg border border-danwell-teal/20 bg-danwell-teal/10 px-3 py-2 text-sm text-danwell-navy"
        >
          {state.success}
        </p>
      ) : null}

      <FormField
        name="periodMonth"
        label="Period month"
        error={errors.periodMonth}
        hint="Generation is idempotent. Existing charges are never changed."
      >
        <Input
          id="periodMonth"
          name="periodMonth"
          type="month"
          defaultValue={defaultPeriod ?? currentPeriod()}
          required
          aria-invalid={Boolean(errors.periodMonth)}
        />
      </FormField>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Generating..." : "Generate charges"}
        </Button>
      </div>
    </form>
  );
}
