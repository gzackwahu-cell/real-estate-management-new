"use client";

import { useActionState } from "react";
import { FormField } from "@/components/portfolio/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createDepositAction } from "@/lib/finance/actions";
import type { FinanceFormState } from "@/lib/finance/validation";

const initialState: FinanceFormState = {};

type CreateDepositFormProps = {
  leaseId: string;
  defaultRequiredAmount: number;
};

export function CreateDepositForm({
  leaseId,
  defaultRequiredAmount,
}: CreateDepositFormProps) {
  const [state, formAction, pending] = useActionState<FinanceFormState, FormData>(
    createDepositAction,
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

      <input type="hidden" name="leaseId" value={leaseId} />

      <FormField
        name="requiredAmount"
        label="Required amount (KES)"
        error={errors.requiredAmount}
        hint="Defaults to the lease deposit amount unless a different amount is approved."
      >
        <Input
          id="requiredAmount"
          name="requiredAmount"
          type="number"
          step="0.01"
          min="0"
          defaultValue={String(defaultRequiredAmount)}
          required
          aria-invalid={Boolean(errors.requiredAmount)}
        />
      </FormField>

      <FormField name="notes" label="Notes" error={errors.notes}>
        <Textarea
          id="notes"
          name="notes"
          aria-invalid={Boolean(errors.notes)}
        />
      </FormField>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Create deposit record"}
        </Button>
      </div>
    </form>
  );
}
