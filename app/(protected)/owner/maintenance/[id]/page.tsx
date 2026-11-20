import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MaintenanceHistory } from "@/components/maintenance/maintenance-history";
import { PortalDetail, PortalDetailList } from "@/components/portal/portal-detail-list";
import { PortalLoading } from "@/components/portal/portal-loading";
import { PortalPageHeader } from "@/components/portal/portal-page-header";
import { StatusBadge } from "@/components/portfolio/status-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { withRoles } from "@/lib/auth/guards";
import { ROLES } from "@/lib/auth/roles";
import {
  formatDate,
  labelFor,
  MAINTENANCE_CATEGORIES,
  maintenancePriorityTone,
  maintenanceStatusTone,
} from "@/lib/maintenance/constants";
import {
  getOwnershipMap,
  loadOwnerMaintenanceRequest,
} from "@/lib/portal/owner";

type OwnerMaintenanceDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default function OwnerMaintenanceDetailPage({
  params,
}: OwnerMaintenanceDetailPageProps) {
  return (
    <Suspense fallback={<PortalLoading label="Loading maintenance request..." />}>
      <OwnerMaintenanceDetailContent params={params} />
    </Suspense>
  );
}

async function OwnerMaintenanceDetailContent({
  params,
}: OwnerMaintenanceDetailPageProps) {
  const { id } = await params;

  const data = await withRoles(
    [ROLES.OWNER, ROLES.SUPER_ADMIN, ROLES.ADMIN],
    async (_context, supabase) => {
      const ownership = await getOwnershipMap(supabase, _context.userId);
      return loadOwnerMaintenanceRequest(supabase, ownership, id);
    },
  );

  if (!data) {
    notFound();
  }

  const { request, history } = data;

  return (
    <div className="space-y-6">
      <Link
        href="/owner/maintenance"
        className="inline-block text-sm text-danwell-teal hover:underline"
      >
        ← Back to maintenance
      </Link>

      <PortalPageHeader
        eyebrow="Owner maintenance"
        title={request.title}
        description={`Reported ${formatDate(request.reported_date)}`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-danwell-navy">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <StatusBadge
              label={request.status.replace("_", " ")}
              tone={maintenanceStatusTone(request.status)}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-danwell-navy">Priority</CardTitle>
          </CardHeader>
          <CardContent>
            <StatusBadge
              label={request.priority.replace("_", " ")}
              tone={maintenancePriorityTone(request.priority)}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-danwell-navy">Category</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {labelFor(MAINTENANCE_CATEGORIES, request.category)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-danwell-navy">Completed</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {formatDate(request.completed_at?.slice(0, 10))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-danwell-navy">Request details</CardTitle>
          <CardDescription>Property context and issue summary.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <PortalDetailList columns="sm:grid-cols-3">
            <PortalDetail
              label="Property"
              value={request.properties?.title ?? "Property record"}
            />
            <PortalDetail
              label="Unit"
              value={request.units?.unit_number ?? "Property-level"}
            />
            <PortalDetail label="Reported" value={formatDate(request.reported_date)} />
          </PortalDetailList>
          <p className="whitespace-pre-line text-sm text-muted-foreground">
            {request.description}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-danwell-navy">Progress history</CardTitle>
          <CardDescription>
            Status changes and work updates shared for this property.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MaintenanceHistory
            request={request}
            history={history}
            staff={[]}
            tenantView
          />
        </CardContent>
      </Card>

      {request.resolution ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-danwell-navy">Resolution</CardTitle>
            <CardDescription>How the issue was resolved.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-line text-sm">{request.resolution}</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
