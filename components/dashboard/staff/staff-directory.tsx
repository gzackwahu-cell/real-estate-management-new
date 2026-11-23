"use client";

import { useState } from "react";
import { StatusBadge } from "@/components/portfolio/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ROLES } from "@/lib/auth/roles";
import type {
  StaffActionState,
  StaffAssignment,
  StaffProfile,
  StaffRole,
} from "@/lib/auth/staff-queries";
import { formatDateTime } from "@/lib/finance/constants";
import { RoleAssignmentControl } from "./role-assignment-control";
import { StaffActionButton } from "./staff-action-button";

export function StaffDirectory({
  profiles,
  roles,
  assignments,
  currentUserId,
  canManageProfiles,
  canManageRoles,
  profileNote,
  roleNote,
  setProfileActiveAction,
  deactivateRoleAction,
  assignRoleAction,
}: {
  profiles: readonly StaffProfile[];
  roles: readonly StaffRole[];
  assignments: readonly StaffAssignment[];
  currentUserId: string;
  canManageProfiles: boolean;
  canManageRoles: boolean;
  profileNote: string | null;
  roleNote: string | null;
  setProfileActiveAction: (
    profileId: string,
    isActive: boolean,
  ) => Promise<StaffActionState>;
  deactivateRoleAction: (
    profileId: string,
    roleId: string,
  ) => Promise<StaffActionState>;
  assignRoleAction: (
    profileId: string,
    roleId: string,
  ) => Promise<StaffActionState>;
}) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const visibleProfiles = profiles.filter((profile) =>
    [profile.fullName, profile.email, profile.phone]
      .filter(Boolean)
      .some((value) => value?.toLowerCase().includes(normalizedQuery)),
  );
  const roleById = new Map(roles.map((role) => [role.id, role]));

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle className="text-base text-danwell-navy">Users and roles</CardTitle>
          <CardDescription>
            {profiles.length} profile(s) visible · {assignments.filter((a) => a.isActive).length} active role assignment(s)
          </CardDescription>
        </div>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search name or email"
          className="h-8 w-56 rounded-lg border bg-background px-2 text-sm"
        />
      </CardHeader>
      <CardContent>
        {profileNote ? (
          <p className="mb-3 rounded-lg border border-dashed bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            {profileNote}
          </p>
        ) : null}
        {roleNote ? (
          <p className="mb-3 rounded-lg border border-dashed bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            {roleNote}
          </p>
        ) : null}
        {visibleProfiles.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No profiles match the current search.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Profile</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 pr-3 font-medium">Roles</th>
                  <th className="py-2 pr-3 font-medium">Assign role</th>
                  <th className="py-2 font-medium">Account</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {visibleProfiles.map((profile) => {
                  const profileAssignments = assignments.filter(
                    (assignment) =>
                      assignment.profileId === profile.id && assignment.isActive,
                  );
                  const selfDeactivation =
                    profile.id === currentUserId && profile.isActive;

                  return (
                    <tr key={profile.id}>
                      <td className="py-2.5 pr-3 align-top">
                        <p className="font-medium text-danwell-navy">
                          {profile.fullName || "Unnamed profile"}
                          {profile.id === currentUserId ? (
                            <span className="ml-1 text-xs text-muted-foreground">(you)</span>
                          ) : null}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {profile.email ?? "No email on profile"}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {profile.phone ?? "No phone"}
                        </p>
                      </td>
                      <td className="py-2.5 pr-3 align-top">
                        <StatusBadge
                          label={profile.isActive ? "Active" : "Inactive"}
                          tone={profile.isActive ? "positive" : "muted"}
                        />
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {profile.createdAt
                            ? `Added ${formatDateTime(profile.createdAt)}`
                            : "—"}
                        </p>
                      </td>
                      <td className="py-2.5 pr-3 align-top">
                        <div className="flex flex-col items-start gap-1">
                          {profileAssignments.length === 0 ? (
                            <span className="text-xs text-muted-foreground">No roles</span>
                          ) : (
                            profileAssignments.map((assignment) => {
                              const role = roleById.get(assignment.roleId);
                              if (!role) return null;
                              const cannotRemoveSelf =
                                role.name === ROLES.SUPER_ADMIN &&
                                profile.id === currentUserId;
                              return (
                                <span key={assignment.roleId} className="inline-flex items-center gap-1">
                                  <Badge tone={role.name === ROLES.SUPER_ADMIN ? "info" : "neutral"}>
                                    {role.name}
                                  </Badge>
                                  {canManageRoles && !cannotRemoveSelf ? (
                                    <StaffActionButton
                                      label="Remove"
                                      destructive
                                      action={() =>
                                        deactivateRoleAction(profile.id, role.id)
                                      }
                                      confirm={{
                                        title: "Remove role",
                                        description: `Deactivate ${role.name} for ${profile.fullName || "this profile"}? The assignment is kept as inactive.`,
                                        confirmLabel: "Remove role",
                                      }}
                                    />
                                  ) : null}
                                </span>
                              );
                            })
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 pr-3 align-top">
                        <RoleAssignmentControl
                          profile={profile}
                          roles={roles}
                          assignments={assignments}
                          assignAction={assignRoleAction}
                          canManageRoles={canManageRoles}
                        />
                      </td>
                      <td className="py-2.5 align-top">
                        <StaffActionButton
                          label={profile.isActive ? "Deactivate" : "Activate"}
                          destructive={profile.isActive}
                          disabled={!canManageProfiles || selfDeactivation}
                          action={() =>
                            setProfileActiveAction(profile.id, !profile.isActive)
                          }
                          confirm={
                            profile.isActive
                              ? {
                                  title: "Deactivate profile",
                                  description: `Disable sign-in access for ${profile.fullName || "this profile"}? This does not delete any data.`,
                                  confirmLabel: "Deactivate",
                                }
                              : undefined
                          }
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
