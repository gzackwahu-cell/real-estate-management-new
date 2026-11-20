"use client";

import { useActionState } from "react";
import { FormField } from "@/components/portfolio/form-field";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { reviewApplicationAction } from "@/lib/tenancy/actions";
import { REVIEWABLE_APPLICATION_STATUSES } from "@/lib/tenancy/constants";
import type { ApplicationRecord, TenancyFormState } from "@/lib/tenancy/validation";

const initialState: TenancyFormState = {};

type ApplicationReviewFormProps = {
  application: ApplicationRecord;
};

export function ApplicationReviewForm({ application }: ApplicationReviewFormProps) {
  const action = reviewApplicationAction.bind(null, application.id);
  const [state, formAction, pending] = useActionState<TenancyFormState, FormData>(
    action,
    initialState,
  );
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-5" noValidate>
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

      <FormField name="status" label="Decision" error={errors.status}>
        <Select
          id="status"
          name="status"
          defaultValue={application.status === "pending" ? "under_review" : application.status}
          aria-invalid={Boolean(errors.status)}
        >
          {REVIEWABLE_APPLICATION_STATUSES.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField
        name="decisionNotes"
        label="Decision notes"
        error={errors.decisionNotes}
        hint="Required for approved and rejected decisions."
      >
        <Textarea
          id="decisionNotes"
          name="decisionNotes"
          defaultValue={application.decision_notes ?? ""}
          aria-invalid={Boolean(errors.decisionNotes)}
        />
      </FormField>

      <p className="text-xs text-muted-foreground">
        Approval links or creates the tenant record only. Use the next-step link
        above to create a lease explicitly.
      </p>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving decision..." : "Save decision"}
        </Button>
      </div>
    </form>
  );
}
