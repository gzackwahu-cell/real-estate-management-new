"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/portfolio/form-field";
import { INQUIRY_STATUSES, VIEWING_STATUSES } from "@/lib/listings/constants";
import {
  updateEnquiryAction,
  updateViewingAction,
} from "@/lib/listings/staff-actions";
import type { StaffFormState } from "@/lib/listings/validation";

export function FollowUpForm({
  kind,
  id,
  status,
  notes,
}: {
  kind: "enquiry" | "viewing";
  id: string;
  status: string;
  notes: string;
}) {
  const action =
    kind === "enquiry"
      ? updateEnquiryAction.bind(null, id)
      : updateViewingAction.bind(null, id);
  const [state, formAction, pending] = useActionState<StaffFormState, FormData>(
    action,
    {},
  );
  const options = kind === "enquiry" ? INQUIRY_STATUSES : VIEWING_STATUSES;

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state.error ? (
        <p role="alert" className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p role="status" className="rounded-lg border border-danwell-teal/25 bg-danwell-teal/10 px-3 py-2 text-sm text-danwell-teal">
          {state.success}
        </p>
      ) : null}

      <FormField name="status" label="Status" error={state.fieldErrors?.status}>
        <Select id="status" name="status" defaultValue={status}>
          {options.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </Select>
      </FormField>

      <FormField name="followUpNotes" label="Follow-up notes" error={state.fieldErrors?.followUpNotes}>
        <Textarea id="followUpNotes" name="followUpNotes" rows={5} defaultValue={notes} />
      </FormField>

      <Button type="submit" disabled={pending} className="bg-danwell-navy text-white hover:bg-danwell-teal">
        {pending ? "Saving..." : "Save update"}
      </Button>
    </form>
  );
}
