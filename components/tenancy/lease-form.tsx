"use client";

import { useActionState, useState } from "react";
import { FormField } from "@/components/portfolio/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createLeaseAction, updateLeaseAction } from "@/lib/tenancy/actions";
import { LEASE_STATUSES } from "@/lib/tenancy/constants";
import type {
  LeaseRecord,
  TenancyFormState,
  TenantOption,
  UnitOption,
} from "@/lib/tenancy/validation";

const initialState: TenancyFormState = {};

type LeaseFormProps = {
  tenants: TenantOption[];
  units: UnitOption[];
  mode: "create" | "edit" | "renew";
  lease?: LeaseRecord;
  initialTenantId?: string;
  initialUnitId?: string;
  initialStartDate?: string;
  initialEndDate?: string;
  initialMonthlyRent?: string;
  initialSourceApplicationId?: string;
  initialRentDueDay?: number;
};

export function LeaseForm({
  tenants,
  units,
  mode,
  lease,
  initialTenantId,
  initialUnitId,
  initialStartDate,
  initialEndDate,
  initialMonthlyRent,
  initialSourceApplicationId,
  initialRentDueDay,
}: LeaseFormProps) {
  const action =
    mode === "edit" && lease
      ? updateLeaseAction.bind(null, lease.id)
      : createLeaseAction;
  const [state, formAction, pending] = useActionState<TenancyFormState, FormData>(
    action,
    initialState,
  );
  const errors = state.fieldErrors ?? {};

  const [tenantId, setTenantId] = useState(
    lease?.tenant_id ?? initialTenantId ?? tenants[0]?.id ?? "",
  );
  const [unitId, setUnitId] = useState(
    lease?.unit_id ?? initialUnitId ?? units[0]?.id ?? "",
  );
  const selectedTenant = tenants.find((tenant) => tenant.id === tenantId);
  const selectedUnit = units.find((unit) => unit.id === unitId);

  const [status, setStatus] = useState(
    mode === "renew" ? "pending" : (lease?.status ?? "draft"),
  );
  const [monthlyRent, setMonthlyRent] = useState(
    lease
      ? String(lease.monthly_rent)
      : (initialMonthlyRent ??
          (selectedUnit ? String(selectedUnit.monthly_rent) : "0")),
  );

  const sourceApplicationId =
    lease?.source_application_id ?? initialSourceApplicationId ?? "";
  const renewalOf = mode === "renew" ? lease?.id ?? "" : lease?.renewal_of ?? "";
  const startDate =
    mode === "renew"
      ? (initialStartDate ?? "")
      : (lease?.start_date ?? initialStartDate ?? "");
  const endDate =
    mode === "renew"
      ? (initialEndDate ?? "")
      : (lease?.end_date ?? initialEndDate ?? "");
  const statusOptions =
    mode === "edit"
      ? LEASE_STATUSES
      : LEASE_STATUSES.filter((option) => option.value !== "terminated");

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

      {tenants.length === 0 || units.length === 0 ? (
        <p className="rounded-lg border border-amber-600/20 bg-amber-600/10 px-3 py-2 text-sm text-amber-800">
          Register an active tenant and have an active unit available before
          creating a lease.
        </p>
      ) : null}

      <input type="hidden" name="sourceApplicationId" value={sourceApplicationId} />
      <input type="hidden" name="renewalOf" value={renewalOf} />
      {mode === "renew" ? (
        <>
          <input type="hidden" name="tenantId" value={tenantId} />
          <input type="hidden" name="unitId" value={unitId} />
        </>
      ) : null}

      {mode === "renew" && lease ? (
        <div className="rounded-lg border border-danwell-teal/20 bg-danwell-teal/5 px-3 py-2 text-sm">
          <p className="font-medium text-danwell-navy">Renewing existing lease</p>
          <p className="mt-1 text-muted-foreground">
            {selectedTenant?.full_name ?? "Tenant"} ·{" "}
            {selectedUnit?.unit_number ?? "Unit"} · Current lease ends{" "}
            {lease.end_date}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            The renewal must start after the current lease ends.
          </p>
        </div>
      ) : null}

      <div className="grid gap-5 md:grid-cols-2">
        {mode === "renew" ? (
          <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm md:col-span-2">
            <p className="text-xs text-muted-foreground">Tenant / unit</p>
            <p className="mt-1 font-medium text-danwell-navy">
              {selectedTenant?.full_name ?? "Tenant"} ·{" "}
              {selectedUnit?.unit_number ?? "Unit"} ·{" "}
              {selectedUnit?.property_title ?? "Property"}
            </p>
          </div>
        ) : (
          <>
            <FormField name="tenantId" label="Tenant" error={errors.tenantId}>
              <Select
                id="tenantId"
                name="tenantId"
                value={tenantId}
                onChange={(event) => setTenantId(event.target.value)}
                aria-invalid={Boolean(errors.tenantId)}
              >
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.full_name} · {tenant.phone}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField name="unitId" label="Unit" error={errors.unitId}>
              <Select
                id="unitId"
                name="unitId"
                value={unitId}
                onChange={(event) => {
                  const nextId = event.target.value;
                  setUnitId(nextId);
                  if (mode === "create") {
                    const nextUnit = units.find((unit) => unit.id === nextId);
                    if (nextUnit) {
                      setMonthlyRent(String(nextUnit.monthly_rent));
                    }
                  }
                }}
                aria-invalid={Boolean(errors.unitId)}
              >
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.unit_number} · {unit.property_title}{unit.floor ? ` · ${unit.floor}` : ""}
                  </option>
                ))}
              </Select>
            </FormField>
          </>
        )}

        <FormField name="startDate" label="Start date" error={errors.startDate}>
          <Input
            id="startDate"
            name="startDate"
            type="date"
            defaultValue={startDate}
            aria-invalid={Boolean(errors.startDate)}
          />
        </FormField>

        <FormField name="endDate" label="End date" error={errors.endDate}>
          <Input
            id="endDate"
            name="endDate"
            type="date"
            defaultValue={endDate}
            aria-invalid={Boolean(errors.endDate)}
          />
        </FormField>

        <FormField
          name="monthlyRent"
          label="Monthly rent (KES)"
          error={errors.monthlyRent}
        >
          <Input
            id="monthlyRent"
            name="monthlyRent"
            type="number"
            min="0"
            step="0.01"
            value={monthlyRent}
            onChange={(event) => setMonthlyRent(event.target.value)}
            aria-invalid={Boolean(errors.monthlyRent)}
          />
        </FormField>

        <FormField name="rentDueDay" label="Rent due day" error={errors.rentDueDay}>
          <Input
            id="rentDueDay"
            name="rentDueDay"
            type="number"
            min="1"
            max="28"
            defaultValue={lease?.rent_due_day ?? initialRentDueDay ?? 1}
            aria-invalid={Boolean(errors.rentDueDay)}
          />
        </FormField>

        <FormField name="status" label="Lease status" error={errors.status}>
          <Select
            id="status"
            name="status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            aria-invalid={Boolean(errors.status)}
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </FormField>

        <div className="flex items-end pb-2">
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              name="securityDepositRequired"
              defaultChecked={
                lease?.security_deposit_required ??
                selectedUnit?.deposit_required ??
                true
              }
              className="size-4 rounded border-input accent-[var(--color-danwell-teal)]"
            />
            Security deposit required
          </label>
        </div>

        <FormField
          name="specialTerms"
          label="Special terms"
          error={errors.specialTerms}
          className="md:col-span-2"
        >
          <Textarea
            id="specialTerms"
            name="specialTerms"
            defaultValue={lease?.special_terms ?? ""}
            aria-invalid={Boolean(errors.specialTerms)}
          />
        </FormField>

        <FormField
          name="notes"
          label="Notes"
          error={errors.notes}
          className="md:col-span-2"
        >
          <Textarea
            id="notes"
            name="notes"
            defaultValue={lease?.notes ?? ""}
            aria-invalid={Boolean(errors.notes)}
          />
        </FormField>

        {status === "terminated" ? (
          <>
            <FormField
              name="terminatedOn"
              label="Termination date"
              error={errors.terminatedOn}
            >
              <Input
                id="terminatedOn"
                name="terminatedOn"
                type="date"
                defaultValue={lease?.terminated_on ?? ""}
                aria-invalid={Boolean(errors.terminatedOn)}
              />
            </FormField>
            <FormField
              name="terminationReason"
              label="Termination reason"
              error={errors.terminationReason}
            >
              <Input
                id="terminationReason"
                name="terminationReason"
                defaultValue={lease?.termination_reason ?? ""}
                aria-invalid={Boolean(errors.terminationReason)}
              />
            </FormField>
          </>
        ) : null}
      </div>

      <p className="text-xs text-muted-foreground">
        Overlapping active or pending leases for the same unit are rejected by
        the database. Rent due day is limited to 1–28.
      </p>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending || tenants.length === 0 || units.length === 0}>
          {pending
            ? "Saving..."
            : mode === "renew"
              ? "Renew lease"
              : mode === "edit"
                ? "Save lease"
                : "Create lease"}
        </Button>
      </div>
    </form>
  );
}
