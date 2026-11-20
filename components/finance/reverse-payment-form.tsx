"use client";

import { useActionState } from "react";
import { FormField } from "@/components/portfolio/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { reversePaymentAction } from "@/lib/finance/actions";
import { formatMoney } from "@/lib/finance/constants";
import type { FinanceFormState } from "@/lib/finance/validation";

const initialState: FinanceFormState = {};

type ReversePaymentFormProps = {
  paymentId: string;
  remainingAmount: number;
};

export function ReversePaymentForm({
  paymentId,
  remainingAmount,
}: ReversePaymentFormProps) {
  const action = reversePaymentAction.bind(null, paymentId);
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
        <p className="text-xs text-muted-foreground">Remaining reversible amount</p>
        <p className="mt-1 font-medium text-danwell-navy">
          {formatMoney(remainingAmount)}
        </p>
      </div>

      <FormField
        name="amount"
        label="Amount (KES)"
        error={errors.amount}
        hint={`Cannot exceed ${formatMoney(remainingAmount)}.`}
      >
        <Input
          id="amount"
          name="amount"
          type="number"
          step="0.01"
          min="0.01"
          max={remainingAmount}
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

      <p className="text-xs text-muted-foreground">
        The payment is retained; a reversal and audit entry are created.
      </p>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending || remainingAmount <= 0}>
          {pending ? "Reversing..." : "Record reversal"}
        </Button>
      </div>
    </form>
  );
}
