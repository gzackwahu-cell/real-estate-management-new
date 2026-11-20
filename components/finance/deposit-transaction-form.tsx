"use client";

import { useActionState } from "react";
import { FormField } from "@/components/portfolio/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { recordDepositTransactionAction } from "@/lib/finance/actions";
import {
  DEPOSIT_DIRECTIONS,
  DEPOSIT_TRANSACTION_TYPES,
} from "@/lib/finance/constants";
import type { FinanceFormState } from "@/lib/finance/validation";

const initialState: FinanceFormState = {};

type DepositTransactionFormProps = {
  depositId: string;
  today: string;
};

export function DepositTransactionForm({
  depositId,
  today,
}: DepositTransactionFormProps) {
  const action = recordDepositTransactionAction.bind(null, depositId);
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
          name="transactionType"
          label="Transaction type"
          error={errors.transactionType}
        >
          <Select
            id="transactionType"
            name="transactionType"
            defaultValue={DEPOSIT_TRANSACTION_TYPES[0].value}
            required
            aria-invalid={Boolean(errors.transactionType)}
          >
            {DEPOSIT_TRANSACTION_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField name="direction" label="Direction" error={errors.direction}>
          <Select
            id="direction"
            name="direction"
            defaultValue={DEPOSIT_DIRECTIONS[0].value}
            required
            aria-invalid={Boolean(errors.direction)}
          >
            {DEPOSIT_DIRECTIONS.map((direction) => (
              <option key={direction.value} value={direction.value}>
                {direction.label}
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
          name="transactionDate"
          label="Transaction date"
          error={errors.transactionDate}
        >
          <Input
            id="transactionDate"
            name="transactionDate"
            type="date"
            defaultValue={today}
            required
            aria-invalid={Boolean(errors.transactionDate)}
          />
        </FormField>

        <FormField
          name="transactionReference"
          label="Transaction reference"
          error={errors.transactionReference}
          className="md:col-span-2"
        >
          <Input
            id="transactionReference"
            name="transactionReference"
            type="text"
            aria-invalid={Boolean(errors.transactionReference)}
          />
        </FormField>

        <FormField
          name="reason"
          label="Reason"
          error={errors.reason}
          className="md:col-span-2"
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
        Refunds and deductions reduce held deposit; all reasons are audited.
      </p>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Record transaction"}
        </Button>
      </div>
    </form>
  );
}
