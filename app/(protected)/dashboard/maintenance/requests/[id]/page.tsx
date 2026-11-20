import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExpenseTable } from "@/components/maintenance/expense-table";
import { MaintenanceHistory } from "@/components/maintenance/maintenance-history";
import {
  AssignmentForm,
  NoteForm,
  StatusForm,
} from "@/components/maintenance/request-update-forms";
import { StatusBadge } from "@/components/portfolio/status-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { hasPermission } from "@/lib/auth/dal";
import { withPermission } from "@/lib/auth/guards";
import {
  formatDate,
  isOpenMaintenanceStatus,
  labelFor,
  MAINTENANCE_CATEGORIES,
  maintenancePriorityTone,
  maintenanceStatusTone,
} from "@/lib/maintenance/constants";
import {
  getMaintenanceExpenses,
  getMaintenanceRequest,
  getMaintenanceRequestHistory,
  getStaffDirectory,
} from "@/lib/maintenance/queries";

type RequestDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default function RequestDetailPage({ params }: RequestDetailPageProps) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading request...</p>}>
      <RequestDetailContent params={params} />
    </Suspense>
  );
}

async function RequestDetailContent({ params }: RequestDetailPageProps) {
  const { id } = await params;
  const canEdit = await hasPermission("maintenance", "edit");
  const canViewExpenses = await hasPermission("expenses", "view");

  const data = await withPermission("maintenance", "view", async (_context, supabase) => {
    const [request, history, staff, expenses] = await Promise.all([
      getMaintenanceRequest(supabase, id),
      getMaintenanceRequestHistory(supabase, id),
      getStaffDirectory(supabase),
      canViewExpenses ? getMaintenanceExpenses(supabase, { maintenanceRequestId: id }) : Promise.resolve([]),
    ]);
    return { request, history, staff, expenses };
  });

  if (!data.request) {
    notFound();
  }

  const request = data.request;
  const closed = !isOpenMaintenanceStatus(request.status);
  const assigned = data.staff.find((person) => person.id === request.assigned_to);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium tracking-[0.18em] text-danwell-teal uppercase">
            Maintenance request
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-danwell-navy">{request.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {request.properties?.title ?? "Property record"}
            {request.units?.unit_number ? ` · ${request.units.unit_number}` : ""}
          </p>
        </div>
        <Link
          href="/dashboard/maintenance/requests"
          className="inline-flex h-8 items-center rounded-lg border px-3 text-sm font-medium hover:bg-muted"
        >
          Back to requests
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
            <CardTitle className="text-sm text-danwell-navy">Reported</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">{formatDate(request.reported_date)}</CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-danwell-navy">Request details</CardTitle>
            <CardDescription>Original report and contact information.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Description</dt>
                <dd className="mt-0.5 whitespace-pre-line">{request.description}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Tenant contact</dt>
                <dd className="mt-0.5">{request.tenant_contact || "Not recorded"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Assigned to</dt>
                <dd className="mt-0.5">
                  {assigned
                    ? assigned.full_name || assigned.email || "Staff member"
                    : request.assigned_to
                      ? "Staff member"
                      : "Unassigned"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Completed</dt>
                <dd className="mt-0.5">{formatDate(request.completed_at?.slice(0, 10))}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Resolution</dt>
                <dd className="mt-0.5 whitespace-pre-line">
                  {request.resolution || "Not yet recorded"}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-danwell-navy">Update history</CardTitle>
            <CardDescription>Assignment changes, status changes and work notes.</CardDescription>
          </CardHeader>
          <CardContent>
            <MaintenanceHistory
              request={request}
              history={data.history}
              staff={data.staff}
            />
          </CardContent>
        </Card>
      </div>

      {canEdit ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-danwell-navy">Assign work</CardTitle>
              <CardDescription>Records assignment history and notifies staff.</CardDescription>
            </CardHeader>
            <CardContent>
              <AssignmentForm
                requestId={request.id}
                staff={data.staff}
                currentAssignedTo={request.assigned_to}
                closed={closed}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-danwell-navy">Change status</CardTitle>
              <CardDescription>Resolution is required for completion.</CardDescription>
            </CardHeader>
            <CardContent>
              <StatusForm
                requestId={request.id}
                currentStatus={request.status}
                closed={closed}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-danwell-navy">Add work note</CardTitle>
              <CardDescription>Appends a note visible on the tenant request.</CardDescription>
            </CardHeader>
            <CardContent>
              <NoteForm requestId={request.id} />
            </CardContent>
          </Card>
        </div>
      ) : null}

      {canViewExpenses ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg text-danwell-navy">Linked expenses</CardTitle>
              <CardDescription>Repair costs recorded against this request.</CardDescription>
            </div>
            <Link
              href="/dashboard/maintenance/expenses"
              className="shrink-0 text-sm text-danwell-teal hover:underline"
            >
              Manage expenses
            </Link>
          </CardHeader>
          <CardContent>
            {data.expenses.length === 0 ? (
              <p className="text-sm text-muted-foreground">No expenses linked to this request.</p>
            ) : (
              <ExpenseTable expenses={data.expenses} showEdit={false} />
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
