"use client";

import { useState } from "react";
import type {
  StaffActionState,
  StaffProfile,
  StaffRole,
  StaffAssignment,
} from "@/lib/auth/staff-queries";
import { StaffActionButton } from "./staff-action-button";

export function RoleAssignmentControl({
  profile,
  roles,
  assignments,
  assignAction,
  canManageRoles,
}: {
  profile: StaffProfile;
  roles: readonly StaffRole[];
  assignments: readonly StaffAssignment[];
  assignAction: (
    profileId: string,
    roleId: string,
  ) => Promise<StaffActionState>;
  canManageRoles: boolean;
}) {
  const [roleId, setRoleId] = useState("");
  const assignedIds = new Set(
    assignments
      .filter(
        (assignment) =>
          assignment.profileId === profile.id && assignment.isActive,
      )
      .map((assignment) => assignment.roleId),
  );
  const availableRoles = roles.filter(
    (role) => role.isActive && !assignedIds.has(role.id),
  );

  if (!canManageRoles) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  if (availableRoles.length === 0) {
    return <span className="text-xs text-muted-foreground">All roles assigned</span>;
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex items-center gap-1">
        <select
          aria-label={`Assign a role to ${profile.fullName || profile.email || profile.id}`}
          value={roleId}
          onChange={(event) => setRoleId(event.target.value)}
          className="h-6 max-w-36 rounded-md border bg-background px-1.5 text-xs"
        >
          <option value="">Select role</option>
          {availableRoles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </select>
        <StaffActionButton
          label="Assign"
          disabled={!roleId}
          action={() => assignAction(profile.id, roleId)}
        />
      </div>
    </div>
  );
}
