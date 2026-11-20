"use client";

import { useActionState, useState } from "react";
import { FormField } from "@/components/portfolio/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { allocatePaymentAction } from "@/lib/finance/actions";
import { formatMoney } from "@/lib/finance/constants";
import type { ChargeWithBalance } from "@/lib/finance/queries";
import type { FinanceFormState } from "@/lib/finance/validation";

const initialState: FinanceFormState = {};

type AllocationRow = {
  chargeId: string;
  amount: string;
};

type PaymentAllocationFormProps = {
  paymentId: string;
  credit: number;
  charges: ChargeWithBalance[];
};

function chargeLabel(charge: ChargeWithBalance): string {
  const identity = [
    charge.leases?.tenants?.full_name ?? "",
    charge.leases?.units?.unit_number ?? "",
  ]
    .filter(Boolean)
    .join(" · ");
  const suffix = identity ? ` · ${identity}` : "";
  return `${charge.period_month}${suffix} · ${formatMoney(charge.balance)} outstanding`;
}

export function PaymentAllocationForm({
  paymentId,
  credit,
  charges,
}: PaymentAllocationFormProps) {
  const action = allocatePaymentAction.bind(null, paymentId);
  const [state, formAction, pending] = useActionState<FinanceFormState, FormData>(
    action,
    initialState,
  );
  const errors = state.fieldErrors ?? {};

  const availableCharges = charges.filter((charge) => charge.balance > 0);
  const firstCharge = availableCharges[0];
  const firstAmount = firstCharge
    ? Math.min(credit, firstCharge.balance).toFixed(2)
    : "";

  const [rows, setRows] = useState<AllocationRow[]>([
    { chargeId: firstCharge?.id ?? "", amount: firstAmount },
  ]);

  const updateRow = (index: number, patch: Partial<AllocationRow>) => {
    setRows((current) =>
      current.map((row, position) => (position === index ? { ...row, ...patch } : row)),
    );
  };

  const allocationsJson = JSON.stringify(
    rows.map((row) => ({
      chargeId: row.chargeId,
      amount: Number(row.amount) || 0,
    })),
  );
  const hasIncompleteRow = rows.some((row) => !row.chargeId);

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
        <p className="text-xs text-muted-foreground">Unallocated credit</p>
        <p className="mt-1 font-medium text-danwell-navy">{formatMoney(credit)}</p>
      </div>

      <input type="hidden" name="allocationsJson" value={allocationsJson} />

      <div className="space-y-3">
        {rows.map((row, index) => (
          <div
            key={index}
            className="grid gap-3 rounded-lg border bg-muted/20 p-3 sm:grid-cols-[1fr_150px_auto]"
          >
            <FormField name={`chargeId-${index}`} label="Charge">
              <Select
                id={`chargeId-${index}`}
                value={row.chargeId}
                onChange={(event) => updateRow(index, { chargeId: event.target.value })}
              >
                <option value="">Select a charge</option>
                {availableCharges.map((charge) => (
                  <option key={charge.id} value={charge.id}>
                    {chargeLabel(charge)}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField name={`amount-${index}`} label="Amount (KES)">
              <Input
                id={`amount-${index}`}
                type="number"
                step="0.01"
                min="0.01"
                value={row.amount}
                onChange={(event) => updateRow(index, { amount: event.target.value })}
              />
            </FormField>

            <div className="flex items-end">
              <Button
                type="button"
                variant="outline"
                disabled={rows.length === 1}
                onClick={() =>
                  setRows((current) => current.filter((_, position) => position !== index))
                }
              >
                Remove
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={() => setRows((current) => [...current, { chargeId: "", amount: "" }])}
      >
        Add charge
      </Button>

      <FormField
        name="reason"
        label="Reason"
        error={errors.reason}
        hint="Manual allocation requires an audited reason."
      >
        <Textarea
          id="reason"
          name="reason"
          required
          aria-invalid={Boolean(errors.reason)}
        />
      </FormField>

      <p className="text-xs text-muted-foreground">
        FIFO happens automatically when recording a payment. This form is for
        authorized manual allocation only.
      </p>

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={pending || availableCharges.length === 0 || hasIncompleteRow}
        >
          {pending ? "Allocating..." : "Allocate payment"}
        </Button>
      </div>
    </form>
  );
}
