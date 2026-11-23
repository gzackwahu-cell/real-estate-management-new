import { Suspense } from "react";
import { KeyRound, ShieldCheck, Users } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { PermissionMatrix } from "@/components/dashboard/staff/permission-matrix";
import { StaffDirectory } from "@/components/dashboard/staff/staff-directory";
import { DashboardSkeleton } from "@/components/ui/skeleton";
import { withPermission } from "@/lib/auth/guards";
import {
  getStaffAccessSnapshot,
  STAFF_WRITES_ENABLED,
} from "@/lib/auth/staff-queries";
import {
  assignRoleAction,
  deactivateRoleAction,
  grantPermissionAction,
  revokePermissionAction,
  setProfileActiveAction,
} from "./actions";

export default function StaffPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <StaffContent />
    </Suspense>
  );
}

async function StaffContent() {
  const { snapshot, capabilities } = await withPermission(
    "users_roles",
    "view",
    async (context, supabase) => {
      const access = await getStaffAccessSnapshot(supabase);

      const adminOnly = "Only a Super Admin can change users, roles or permissions.";
      const grantBlocked =
        "Role and permission changes are read-only: production currently grants authenticated users SELECT only on the role and permission tables. The RLS policies allow Super Admin writes, but the table grants are missing.";

      return {
        snapshot: access,
        capabilities: {
          currentUserId: context.userId,
          canManageProfiles: context.isSuperAdmin,
          canManageRoles: context.isSuperAdmin && STAFF_WRITES_ENABLED,
          profileNote: context.isSuperAdmin ? null : adminOnly,
          roleNote: !context.isSuperAdmin
            ? adminOnly
            : STAFF_WRITES_ENABLED
              ? null
              : grantBlocked,
        },
      };
    },
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Staff & access"
        description="Profiles, role assignments and the module/action permission matrix. All data and changes are checked server-side."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Profiles"
          value={snapshot.stats.profiles}
          hint={`${snapshot.stats.activeProfiles} active`}
          icon={Users}
        />
        <StatCard
          label="Active roles"
          value={snapshot.stats.activeRoles}
          hint="Roles available for assignment"
          icon={ShieldCheck}
        />
        <StatCard
          label="Role assignments"
          value={snapshot.stats.activeAssignments}
          hint="Active profile-to-role links"
          icon={Users}
        />
        <StatCard
          label="Permission grants"
          value={snapshot.stats.grants}
          hint="Role-to-permission links"
          icon={KeyRound}
        />
      </div>

      <StaffDirectory
        profiles={snapshot.profiles}
        roles={snapshot.roles}
        assignments={snapshot.assignments}
        currentUserId={capabilities.currentUserId}
        canManageProfiles={capabilities.canManageProfiles}
        canManageRoles={capabilities.canManageRoles}
        profileNote={capabilities.profileNote}
        roleNote={capabilities.roleNote}
        setProfileActiveAction={setProfileActiveAction}
        deactivateRoleAction={deactivateRoleAction}
        assignRoleAction={assignRoleAction}
      />

      <PermissionMatrix
        roles={snapshot.roles}
        modules={snapshot.modules}
        permissions={snapshot.permissions}
        grants={snapshot.grants}
        matrix={snapshot.matrix}
        canManagePermissions={capabilities.canManageRoles}
        note={capabilities.roleNote}
        grantPermissionAction={grantPermissionAction}
        revokePermissionAction={revokePermissionAction}
      />
    </div>
  );
}
