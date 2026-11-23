"use client";

import { useMemo, useState } from "react";
import { StatusBadge } from "@/components/portfolio/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ROLES } from "@/lib/auth/roles";
import type {
  StaffActionState,
  StaffMatrixCell,
  StaffPermission,
  StaffPermissionGrant,
  StaffRole,
} from "@/lib/auth/staff-queries";
import { StaffActionButton } from "./staff-action-button";

export function PermissionMatrix({
  roles,
  modules,
  permissions,
  grants,
  matrix,
  canManagePermissions,
  note,
  grantPermissionAction,
  revokePermissionAction,
}: {
  roles: readonly StaffRole[];
  modules: readonly string[];
  permissions: readonly StaffPermission[];
  grants: readonly StaffPermissionGrant[];
  matrix: Record<string, Record<string, StaffMatrixCell>>;
  canManagePermissions: boolean;
  note: string | null;
  grantPermissionAction: (
    roleId: string,
    permissionId: string,
  ) => Promise<StaffActionState>;
  revokePermissionAction: (
    roleId: string,
    permissionId: string,
  ) => Promise<StaffActionState>;
}) {
  const [roleId, setRoleId] = useState(roles[0]?.id ?? "");
  const [module, setModule] = useState(modules[0] ?? "");

  const selectedRole = roles.find((role) => role.id === roleId) ?? roles[0];
  const selectedModule = modules.includes(module) ? module : modules[0];
  const isSuperAdminRole = selectedRole?.name === ROLES.SUPER_ADMIN;
  const readOnly = !canManagePermissions || isSuperAdminRole;
  const cell = selectedRole ? matrix[selectedRole.id]?.[selectedModule] : undefined;

  const grantedIds = useMemo(
    () =>
      new Set(
        grants
          .filter((grant) => grant.roleId === selectedRole?.id)
          .map((grant) => grant.permissionId),
      ),
    [grants, selectedRole?.id],
  );
  const modulePermissions = permissions.filter(
    (permission) => permission.module === selectedModule,
  );

  if (roles.length === 0 || modules.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base text-danwell-navy">Permissions</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No roles or permissions are available to display.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {note ? (
        <p className="rounded-lg border border-dashed bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          {note}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-danwell-navy">Role permission matrix</CardTitle>
          <CardDescription>
            Granted actions out of available actions for each role and module. Select a cell to inspect it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-xs">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="sticky left-0 bg-card py-2 pr-3 font-medium">Role</th>
                  {modules.map((item) => (
                    <th key={item} className="py-2 pr-2 text-center font-medium">
                      {item}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {roles.map((role) => {
                  const roleIsSuper = role.name === ROLES.SUPER_ADMIN;
                  return (
                    <tr key={role.id}>
                      <th className="sticky left-0 bg-card py-1.5 pr-3 text-left font-medium text-danwell-navy">
                        {role.name}
                        {!role.isActive ? (
                          <span className="ml-1 text-[10px] text-muted-foreground">inactive</span>
                        ) : null}
                      </th>
                      {modules.map((item) => {
                        const current = matrix[role.id]?.[item];
                        const active =
                          role.id === selectedRole?.id && item === selectedModule;
                        const label = roleIsSuper
                          ? "all"
                          : current && current.total > 0
                            ? `${current.granted}/${current.total}`
                            : "—";
                        return (
                          <td key={item} className="py-1.5 pr-2 text-center">
                            <button
                              type="button"
                              aria-label={`Inspect ${role.name} permissions for ${item}`}
                              aria-pressed={active}
                              onClick={() => {
                                setRoleId(role.id);
                                setModule(item);
                              }}
                              className={`rounded-md border px-2 py-1 tabular-nums transition-colors ${
                                active
                                  ? "border-danwell-teal bg-danwell-teal/10 text-danwell-teal"
                                  : "border-transparent hover:border-danwell-navy/20 hover:bg-muted"
                              }`}
                            >
                              {label}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-danwell-navy">
            {selectedRole?.name ?? "Role"} · {selectedModule}
          </CardTitle>
          <CardDescription>
            {isSuperAdminRole
              ? "Super Admin has implicit access to every permission. This row is read-only."
              : `${cell?.granted ?? 0} of ${cell?.total ?? 0} actions granted in this module.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {modulePermissions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No permissions in this module.</p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {modulePermissions.map((permission) => {
                const granted = grantedIds.has(permission.id);
                return (
                  <li
                    key={permission.id}
                    className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-danwell-navy">{permission.action}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {permission.description ?? `${permission.module}:${permission.action}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge
                        label={granted ? "Granted" : "Not granted"}
                        tone={granted ? "positive" : "muted"}
                      />
                      {!readOnly ? (
                        granted ? (
                          <StaffActionButton
                            label="Revoke"
                            destructive
                            action={() =>
                              revokePermissionAction(
                                selectedRole.id,
                                permission.id,
                              )
                            }
                            confirm={{
                              title: "Revoke permission",
                              description: `Remove ${permission.module}:${permission.action} from ${selectedRole.name}?`,
                              confirmLabel: "Revoke",
                            }}
                          />
                        ) : (
                          <StaffActionButton
                            label="Grant"
                            action={() =>
                              grantPermissionAction(
                                selectedRole.id,
                                permission.id,
                              )
                            }
                          />
                        )
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {isSuperAdminRole ? (
            <Badge tone="info" className="mt-3">
              Implicit all permissions
            </Badge>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
