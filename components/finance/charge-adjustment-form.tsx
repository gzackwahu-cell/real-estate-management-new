"use client";

import { useActionState } from "react";
import { FormField } from "@/components/portfolio/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { adjustRentChargeAction } from "@/lib/finance/actions";
import { formatMoney } from "@/lib/finance/constants";
import type { FinanceFormState } from "@/lib/finance/validation";

const initialState: FinanceFormState = {};

type ChargeAdjustmentFormProps = {
  chargeId: string;
  effectiveAmount: number;
};

export function ChargeAdjustmentForm({
  chargeId,
  effectiveAmount,
}: ChargeAdjustmentFormProps) {
  const action = adjustRentChargeAction.bind(null, chargeId);
  const [state, formAction, pending] = useActionState<FinanceFormState, FormData>(
    action,
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

      <div className="rounded-lg border border-danwell-teal/20 bg-danwell-teal/5 px-3 py-2 text-sm">
        <p className="text-xs text-muted-foreground">Current effective charge</p>
        <p className="mt-1 font-medium text-danwell-navy">
          {formatMoney(effectiveAmount)}
        </p>
      </div>

      <FormField
        name="amountDelta"
        label="Adjustment amount (KES)"
        error={errors.amountDelta}
        hint="Positive increases the charge; negative reduces it."
      >
        <Input
          id="amountDelta"
          name="amountDelta"
          type="number"
          step="0.01"
          required
          placeholder="e.g. -500 or 500"
          aria-invalid={Boolean(errors.amountDelta)}
        />
      </FormField>

      <FormField
        name="reason"
        label="Reason"
        error={errors.reason}
        hint="The reason is recorded in the audit trail."
      >
        <Textarea
          id="reason"
          name="reason"
          required
          aria-invalid={Boolean(errors.reason)}
        />
      </FormField>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Record adjustment"}
        </Button>
      </div>
    </form>
  );
}
