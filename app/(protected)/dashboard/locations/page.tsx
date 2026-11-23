import { Suspense } from "react";
import { PageHeader } from "@/components/admin/page-header";
import { LocationsManager } from "@/components/dashboard/locations/locations-manager";
import { DashboardSkeleton } from "@/components/ui/skeleton";
import { withPermission } from "@/lib/auth/guards";
import { getAdminLocationOptions } from "@/lib/locations/queries";

export default function LocationsPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <LocationsContent />
    </Suspense>
  );
}

async function LocationsContent() {
  const { counties, isSuperAdmin } = await withPermission(
    "settings",
    "view",
    async (context, supabase) => {
      const counties = await getAdminLocationOptions(supabase);
      return { counties, isSuperAdmin: context.isSuperAdmin };
    },
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Locations"
        description="Manage Kenya counties and editable areas used by property and listing forms. County names are fixed reference data."
      />
      <LocationsManager counties={counties} isSuperAdmin={isSuperAdmin} />
    </div>
  );
}
