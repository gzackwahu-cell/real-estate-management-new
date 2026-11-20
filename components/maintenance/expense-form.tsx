"use client";

import { useActionState, useState } from "react";
import { FormField } from "@/components/portfolio/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  createMaintenanceExpenseAction,
  updateMaintenanceExpenseAction,
} from "@/lib/maintenance/actions";
import {
  currentDate,
  EXPENSE_CATEGORIES,
  EXPENSE_PAYMENT_STATUSES,
} from "@/lib/maintenance/constants";
import type { ExpenseRecord, MaintenanceFormState } from "@/lib/maintenance/validation";

const initialState: MaintenanceFormState = {};

type Option = { id: string; label: string };
type RequestOption = Option & { propertyId: string };

type ExpenseFormProps = {
  properties: Option[];
  requests: RequestOption[];
  expense?: ExpenseRecord;
};

export function ExpenseForm({ properties, requests, expense }: ExpenseFormProps) {
  const [createState, createAction, createPending] = useActionState(
    createMaintenanceExpenseAction,
    initialState,
  );
  const [updateState, updateAction, updatePending] = useActionState(
    updateMaintenanceExpenseAction.bind(null, expense?.id ?? ""),
    initialState,
  );
  const [selectedProperty, setSelectedProperty] = useState(
    expense?.property_id ?? properties[0]?.id ?? "",
  );

  const state = expense ? updateState : createState;
  const formAction = expense ? updateAction : createAction;
  const pending = expense ? updatePending : createPending;
  const visibleRequests = requests.filter(
    (request) => request.propertyId === selectedProperty,
  );

  return (
    <form action={formAction} className="space-y-5">
      {state.error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="rounded-lg border border-emerald-600/30 bg-emerald-600/10 px-3 py-2 text-sm text-emerald-700">
          {state.success}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField name="propertyId" label="Property" error={state.fieldErrors?.propertyId}>
          <Select
            id="propertyId"
            name="propertyId"
            required
            value={selectedProperty}
            onChange={(event) => setSelectedProperty(event.target.value)}
          >
            <option value="">Select a property</option>
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.label}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField
          name="maintenanceRequestId"
          label="Linked request (optional)"
          error={state.fieldErrors?.maintenanceRequestId}
        >
          <Select
            key={`${selectedProperty}-${expense?.id ?? "new"}`}
            id="maintenanceRequestId"
            name="maintenanceRequestId"
            defaultValue={expense?.maintenance_request_id ?? ""}
          >
            <option value="">Not linked to a request</option>
            {visibleRequests.map((request) => (
              <option key={request.id} value={request.id}>
                {request.label}
              </option>
            ))}
          </Select>
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField name="category" label="Expense type" error={state.fieldErrors?.category}>
          <Select
            id="category"
            name="category"
            required
            defaultValue={expense?.category ?? "materials"}
          >
            {EXPENSE_CATEGORIES.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField name="vendor" label="Supplier / vendor" error={state.fieldErrors?.vendor}>
          <Input
            id="vendor"
            name="vendor"
            maxLength={160}
            defaultValue={expense?.vendor ?? ""}
          />
        </FormField>
      </div>

      <FormField name="description" label="Description" error={state.fieldErrors?.description}>
        <Textarea
          id="description"
          name="description"
          required
          maxLength={2000}
          defaultValue={expense?.description ?? ""}
        />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <FormField name="amount" label="Amount" error={state.fieldErrors?.amount}>
          <Input
            id="amount"
            name="amount"
            type="number"
            min="0.01"
            step="0.01"
            required
            defaultValue={expense ? String(expense.amount) : ""}
          />
        </FormField>

        <FormField
          name="paymentStatus"
          label="Payment status"
          error={state.fieldErrors?.paymentStatus}
        >
          <Select
            id="paymentStatus"
            name="paymentStatus"
            required
            defaultValue={expense?.payment_status ?? "unpaid"}
          >
            {EXPENSE_PAYMENT_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField name="expenseDate" label="Date" error={state.fieldErrors?.expenseDate}>
          <Input
            id="expenseDate"
            name="expenseDate"
            type="date"
            required
            defaultValue={expense?.expense_date ?? currentDate()}
          />
        </FormField>
      </div>

      <FormField name="reference" label="Reference (optional)" error={state.fieldErrors?.reference}>
        <Input
          id="reference"
          name="reference"
          maxLength={120}
          defaultValue={expense?.reference ?? ""}
        />
      </FormField>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : expense ? "Save expense" : "Record expense"}
      </Button>
    </form>
  );
}
