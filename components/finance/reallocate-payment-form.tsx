"use client";

import { useActionState } from "react";
import { FormField } from "@/components/portfolio/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { reallocatePaymentAction } from "@/lib/finance/actions";
import { formatMoney } from "@/lib/finance/constants";
import type { FinanceFormState } from "@/lib/finance/validation";

const initialState: FinanceFormState = {};

type ReallocatePaymentFormProps = {
  paymentId: string;
  allocations: { id: string; label: string; amount: number }[];
  charges: { id: string; label: string; balance: number }[];
};

export function ReallocatePaymentForm({
  paymentId,
  allocations,
  charges,
}: ReallocatePaymentFormProps) {
  const action = reallocatePaymentAction.bind(null, paymentId);
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

      <div className="grid gap-5 md:grid-cols-2">
        <FormField
          name="fromAllocationId"
          label="From allocation"
          error={errors.fromAllocationId}
        >
          <Select
            id="fromAllocationId"
            name="fromAllocationId"
            defaultValue={allocations[0]?.id ?? ""}
            required
            aria-invalid={Boolean(errors.fromAllocationId)}
          >
            <option value="">Select an allocation</option>
            {allocations.map((allocation) => (
              <option key={allocation.id} value={allocation.id}>
                {allocation.label} · {formatMoney(allocation.amount)}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField name="toChargeId" label="To charge" error={errors.toChargeId}>
          <Select
            id="toChargeId"
            name="toChargeId"
            defaultValue={charges[0]?.id ?? ""}
            required
            aria-invalid={Boolean(errors.toChargeId)}
          >
            <option value="">Select a charge</option>
            {charges.map((charge) => (
              <option key={charge.id} value={charge.id} disabled={charge.balance <= 0}>
                {charge.label} · {formatMoney(charge.balance)} available
              </option>
            ))}
          </Select>
        </FormField>

        <FormField name="amount" label="Amount (KES)" error={errors.amount}>
          <Input
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            required
            aria-invalid={Boolean(errors.amount)}
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
      </div>

      <p className="text-xs text-muted-foreground">
        The original allocation is adjusted and the move is audited.
      </p>

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={pending || allocations.length === 0 || charges.length === 0}
        >
          {pending ? "Reallocating..." : "Reallocate"}
        </Button>
      </div>
    </form>
  );
}
