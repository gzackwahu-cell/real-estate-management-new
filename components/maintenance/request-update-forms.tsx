"use client";

import { useActionState } from "react";
import { FormField } from "@/components/portfolio/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  addMaintenanceNoteAction,
  assignMaintenanceRequestAction,
  updateMaintenanceStatusAction,
} from "@/lib/maintenance/actions";
import { MAINTENANCE_STATUSES } from "@/lib/maintenance/constants";
import type { MaintenanceFormState, MaintenanceStaff } from "@/lib/maintenance/validation";

const initialState: MaintenanceFormState = {};

type AssignmentFormProps = {
  requestId: string;
  staff: MaintenanceStaff[];
  currentAssignedTo?: string | null;
  closed: boolean;
};

export function AssignmentForm({
  requestId,
  staff,
  currentAssignedTo,
  closed,
}: AssignmentFormProps) {
  const [state, formAction, pending] = useActionState(
    assignMaintenanceRequestAction.bind(null, requestId),
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-emerald-700">{state.success}</p> : null}

      <FormField name="assignedTo" label="Assign to" error={state.fieldErrors?.assignedTo}>
        <Select
          id="assignedTo"
          name="assignedTo"
          defaultValue={currentAssignedTo ?? ""}
          disabled={closed}
          required
        >
          <option value="">Unassigned</option>
          {staff.map((person) => (
            <option key={person.id} value={person.id}>
              {person.full_name || person.email || "Staff member"}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField name="note" label="Assignment note" error={state.fieldErrors?.note}>
        <Input id="note" name="note" maxLength={1000} disabled={closed} />
      </FormField>

      <Button type="submit" disabled={pending || closed}>
        {pending ? "Saving..." : "Save assignment"}
      </Button>
      {closed ? (
        <p className="text-xs text-muted-foreground">Closed requests cannot be reassigned.</p>
      ) : null}
    </form>
  );
}

type StatusFormProps = {
  requestId: string;
  currentStatus: string;
  closed: boolean;
};

export function StatusForm({ requestId, currentStatus, closed }: StatusFormProps) {
  const [state, formAction, pending] = useActionState(
    updateMaintenanceStatusAction.bind(null, requestId),
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-emerald-700">{state.success}</p> : null}

      <FormField name="status" label="Status" error={state.fieldErrors?.status}>
        <Select
          id="status"
          name="status"
          defaultValue={currentStatus}
          disabled={closed}
          required
        >
          {MAINTENANCE_STATUSES.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField name="note" label="Update note" error={state.fieldErrors?.note}>
        <Textarea id="note" name="note" maxLength={1000} disabled={closed} />
      </FormField>

      <FormField
        name="resolution"
        label="Resolution"
        error={state.fieldErrors?.resolution}
        hint="Required when moving a request to completed."
      >
        <Textarea id="resolution" name="resolution" maxLength={2000} disabled={closed} />
      </FormField>

      <Button type="submit" disabled={pending || closed}>
        {pending ? "Updating..." : "Update status"}
      </Button>
      {closed ? (
        <p className="text-xs text-muted-foreground">Closed requests cannot be reopened.</p>
      ) : null}
    </form>
  );
}

type NoteFormProps = {
  requestId: string;
};

export function NoteForm({ requestId }: NoteFormProps) {
  const [state, formAction, pending] = useActionState(
    addMaintenanceNoteAction.bind(null, requestId),
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-emerald-700">{state.success}</p> : null}

      <FormField name="note" label="Work note" error={state.fieldErrors?.note}>
        <Textarea id="note" name="note" required maxLength={1000} />
      </FormField>

      <Button type="submit" disabled={pending}>
        {pending ? "Adding..." : "Add note"}
      </Button>
    </form>
  );
}
