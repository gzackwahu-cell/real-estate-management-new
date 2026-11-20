import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MaintenanceHistory } from "@/components/maintenance/maintenance-history";
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
  getMaintenanceRequest,
  getMaintenanceRequestHistory,
  type MaintenanceHistory as History,
} from "@/lib/maintenance/queries";
import type { MaintenanceRecord } from "@/lib/maintenance/validation";
import { getTenantPortalData } from "@/lib/tenancy/queries";

type TenantRequestDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default function TenantRequestDetailPage({ params }: TenantRequestDetailPageProps) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading request...</p>}>
      <TenantRequestDetailContent params={params} />
    </Suspense>
  );
}

async function TenantRequestDetailContent({ params }: TenantRequestDetailPageProps) {
  const { id } = await params;
  const data = await withRoles(
    [ROLES.TENANT, ROLES.SUPER_ADMIN, ROLES.ADMIN],
    async (_context, supabase) => {
      const portal = await getTenantPortalData(supabase, _context.userId);
      if (!portal) {
        return null;
      }

      let request: MaintenanceRecord | null = null;
      let history: History = { assignments: [], progress: [] };
      try {
        request = await getMaintenanceRequest(supabase, id);
        if (request) {
          history = await getMaintenanceRequestHistory(supabase, id);
        }
      } catch {
        request = null;
      }

      return { request, history };
    },
  );

  if (!data || !data.request) {
    notFound();
  }

  const request = data.request;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium tracking-[0.18em] text-danwell-teal uppercase">
            My maintenance request
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-danwell-navy">{request.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Reported {formatDate(request.reported_date)}
          </p>
        </div>
        <Link
          href="/tenant/maintenance"
          className="inline-flex h-8 items-center rounded-lg border px-3 text-sm font-medium hover:bg-muted"
        >
          Back to maintenance
        </Link>
      </div>

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
          <CardTitle className="text-lg text-danwell-navy">Updates</CardTitle>
          <CardDescription>
            Assignment changes, status changes and notes shared with you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MaintenanceHistory
            request={request}
            history={data.history}
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
