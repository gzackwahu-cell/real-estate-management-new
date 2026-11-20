"use client";

import { useActionState } from "react";
import { FormField } from "@/components/portfolio/form-field";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { issueReceiptAction } from "@/lib/finance/actions";
import type { FinanceFormState } from "@/lib/finance/validation";

const initialState: FinanceFormState = {};

type IssueReceiptFormProps = {
  paymentId: string;
  hasReceipt: boolean;
};

export function IssueReceiptForm({ paymentId, hasReceipt }: IssueReceiptFormProps) {
  const action = issueReceiptAction.bind(null, paymentId);
  const [state, formAction, pending] = useActionState<FinanceFormState, FormData>(
    action,
    initialState,
  );
  const errors = state.fieldErrors ?? {};

  if (hasReceipt) {
    return null;
  }

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
        name="notes"
        label="Notes"
        error={errors.notes}
        hint="Optional notes to include on the receipt."
      >
        <Textarea id="notes" name="notes" aria-invalid={Boolean(errors.notes)} />
      </FormField>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Issuing..." : "Issue receipt"}
        </Button>
      </div>
    </form>
  );
}
