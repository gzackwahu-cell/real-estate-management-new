"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { VERIFICATION_STATUSES } from "@/lib/portfolio/constants";
import type {
  OwnerOption,
  PropertyOwnerRecord,
} from "@/lib/portfolio/validation";

type OwnerAssignmentFieldsProps = {
  owners: OwnerOption[];
  initialAssignments?: PropertyOwnerRecord[];
  error?: string;
};

type AssignmentState = {
  selected: boolean;
  percentage: string;
  verificationStatus: string;
};

function initialState(
  owners: OwnerOption[],
  assignments: PropertyOwnerRecord[] | undefined,
): Record<string, AssignmentState> {
  const byOwner = new Map(
    (assignments ?? []).map((assignment) => [assignment.owner_id, assignment]),
  );

  return Object.fromEntries(
    owners.map((owner, index) => {
      const assignment = byOwner.get(owner.id);
      return [
        owner.id,
        {
          selected: assignment ? true : index === 0 && !assignments,
          percentage:
            assignment?.ownership_percentage === null ||
            assignment?.ownership_percentage === undefined
              ? ""
              : String(assignment.ownership_percentage),
          verificationStatus: assignment?.verification_status ?? "pending",
        },
      ];
    }),
  );
}

export function OwnerAssignmentFields({
  owners,
  initialAssignments,
  error,
}: OwnerAssignmentFieldsProps) {
  const [assignments, setAssignments] = useState(() =>
    initialState(owners, initialAssignments),
  );
  const [primaryOwnerId, setPrimaryOwnerId] = useState(() => {
    const primary = initialAssignments?.find((assignment) => assignment.is_primary);
    return primary?.owner_id ?? owners[0]?.id ?? "";
  });

  function update(ownerId: string, patch: Partial<AssignmentState>) {
    setAssignments((current) => ({
      ...current,
      [ownerId]: { ...current[ownerId], ...patch },
    }));
  }

  function toggleSelected(ownerId: string, selected: boolean) {
    update(ownerId, { selected });

    if (!selected && primaryOwnerId === ownerId) {
      const nextPrimary = owners.find(
        (owner) => owner.id !== ownerId && assignments[owner.id]?.selected,
      );
      setPrimaryOwnerId(nextPrimary?.id ?? "");
    }

    if (selected && !primaryOwnerId) {
      setPrimaryOwnerId(ownerId);
    }
  }

  return (
    <div className="space-y-2">
      <input type="hidden" name="ownerIds" value={owners.map((owner) => owner.id).join(",")} />
      <input type="hidden" name="primaryOwner" value={primaryOwnerId} />

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Assign</th>
              <th className="px-3 py-2 font-medium">Owner</th>
              <th className="px-3 py-2 font-medium">Percentage</th>
              <th className="px-3 py-2 font-medium">Verification</th>
              <th className="px-3 py-2 font-medium">Primary</th>
            </tr>
          </thead>
          <tbody>
            {owners.map((owner) => {
              const assignment = assignments[owner.id];
              const selected = assignment?.selected ?? false;

              return (
                <tr key={owner.id} className="border-t align-middle">
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      name={`owner_${owner.id}_selected`}
                      checked={selected}
                      onChange={(event) =>
                        toggleSelected(owner.id, event.target.checked)
                      }
                      className="size-4 rounded border-input accent-[var(--color-danwell-teal)]"
                      aria-label={`Assign ${owner.full_name}`}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <p className="font-medium text-foreground">{owner.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {owner.id_reference}
                      {owner.is_active ? "" : " · inactive"}
                    </p>
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      name={`owner_${owner.id}_percentage`}
                      value={assignment?.percentage ?? ""}
                      disabled={!selected}
                      onChange={(event) =>
                        update(owner.id, { percentage: event.target.value })
                      }
                      placeholder="—"
                      className="h-8 w-24"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Select
                      name={`owner_${owner.id}_verification`}
                      value={assignment?.verificationStatus ?? "pending"}
                      disabled={!selected}
                      onChange={(event) =>
                        update(owner.id, { verificationStatus: event.target.value })
                      }
                      className="h-8 w-44"
                    >
                      {VERIFICATION_STATUSES.map((status) => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </Select>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="radio"
                      name="primaryOwnerRadio"
                      value={owner.id}
                      checked={primaryOwnerId === owner.id}
                      disabled={!selected}
                      onChange={() => setPrimaryOwnerId(owner.id)}
                      className="size-4 accent-[var(--color-danwell-navy)]"
                      aria-label={`Make ${owner.full_name} primary`}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <p className="text-xs text-muted-foreground">
        Verified owners must total 100%. Pending ownership rows may leave the
        percentage blank.
      </p>
    </div>
  );
}
