"use client";

import { useActionState, useState } from "react";
import { FormField } from "@/components/portfolio/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { recordPaymentAction } from "@/lib/finance/actions";
import { PAYMENT_TYPES } from "@/lib/finance/constants";
import type { FinanceFormState, PaymentMethod } from "@/lib/finance/validation";

const initialState: FinanceFormState = {};

type LeaseOption = {
  id: string;
  label: string;
  tenantId: string;
  defaultAmount?: number;
};

type RecordPaymentFormProps = {
  leases: LeaseOption[];
  paymentMethods: PaymentMethod[];
  initialLeaseId?: string;
  today: string;
};

function amountForLease(leases: LeaseOption[], leaseId: string): string {
  const lease = leases.find((item) => item.id === leaseId);
  return lease?.defaultAmount === undefined ? "" : String(lease.defaultAmount);
}

export function RecordPaymentForm({
  leases,
  paymentMethods,
  initialLeaseId,
  today,
}: RecordPaymentFormProps) {
  const [state, formAction, pending] = useActionState<FinanceFormState, FormData>(
    recordPaymentAction,
    initialState,
  );
  const errors = state.fieldErrors ?? {};

  const initialLease = initialLeaseId ?? leases[0]?.id ?? "";
  const [leaseId, setLeaseId] = useState(initialLease);
  const [amount, setAmount] = useState(() => amountForLease(leases, initialLease));

  const [paymentMethodId, setPaymentMethodId] = useState(paymentMethods[0]?.id ?? "");
  const [methodCode, setMethodCode] = useState(paymentMethods[0]?.code ?? "");
  const referenceRequired = methodCode === "mpesa" || methodCode === "bank_transfer";

  const selectedLease = leases.find((lease) => lease.id === leaseId);
  const optionsUnavailable = leases.length === 0 || paymentMethods.length === 0;

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

      {optionsUnavailable ? (
        <p className="rounded-lg border border-amber-600/20 bg-amber-600/10 px-3 py-2 text-sm text-amber-800">
          An active lease and at least one active payment method are required before
          recording a payment.
        </p>
      ) : null}

      <input type="hidden" name="tenantId" value={selectedLease?.tenantId ?? ""} />

      <div className="grid gap-5 md:grid-cols-2">
        <FormField name="leaseId" label="Lease" error={errors.leaseId}>
          <Select
            id="leaseId"
            name="leaseId"
            value={leaseId}
            onChange={(event) => {
              const nextId = event.target.value;
              setLeaseId(nextId);
              setAmount(amountForLease(leases, nextId));
            }}
            required
            aria-invalid={Boolean(errors.leaseId)}
          >
            {leases.map((lease) => (
              <option key={lease.id} value={lease.id}>
                {lease.label}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField name="paymentType" label="Payment type" error={errors.paymentType}>
          <Select
            id="paymentType"
            name="paymentType"
            defaultValue={PAYMENT_TYPES[0].value}
            aria-invalid={Boolean(errors.paymentType)}
          >
            {PAYMENT_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField
          name="paymentMethodId"
          label="Payment method"
          error={errors.paymentMethodId}
        >
          <Select
            id="paymentMethodId"
            name="paymentMethodId"
            value={paymentMethodId}
            onChange={(event) => {
              const nextId = event.target.value;
              setPaymentMethodId(nextId);
              setMethodCode(
                paymentMethods.find((method) => method.id === nextId)?.code ?? "",
              );
            }}
            required
            aria-invalid={Boolean(errors.paymentMethodId)}
          >
            {paymentMethods.map((method) => (
              <option key={method.id} value={method.id}>
                {method.name}
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
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            required
            aria-invalid={Boolean(errors.amount)}
          />
        </FormField>

        <FormField name="paymentDate" label="Payment date" error={errors.paymentDate}>
          <Input
            id="paymentDate"
            name="paymentDate"
            type="date"
            defaultValue={today}
            required
            aria-invalid={Boolean(errors.paymentDate)}
          />
        </FormField>

        <FormField
          name="transactionReference"
          label="Transaction reference"
          error={errors.transactionReference}
          hint="Required for M-Pesa and bank transfers. The server validates reference rules."
        >
          <Input
            id="transactionReference"
            name="transactionReference"
            type="text"
            required={referenceRequired}
            aria-invalid={Boolean(errors.transactionReference)}
          />
        </FormField>

        <FormField
          name="notes"
          label="Notes"
          error={errors.notes}
          className="md:col-span-2"
        >
          <Textarea id="notes" name="notes" aria-invalid={Boolean(errors.notes)} />
        </FormField>

        <div className="flex items-end pb-2 md:col-span-2">
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              name="allocateRent"
              defaultChecked
              className="size-4 rounded border-input accent-[var(--color-danwell-teal)]"
            />
            Allocate to outstanding rent automatically (FIFO)
          </label>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Confirmed payments are immutable. Corrections are recorded through reversals,
        not edits.
      </p>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending || optionsUnavailable}>
          {pending ? "Recording..." : "Record payment"}
        </Button>
      </div>
    </form>
  );
}
