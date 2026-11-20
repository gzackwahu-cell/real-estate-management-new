import {
  formatDate,
  labelFor,
  MAINTENANCE_STATUSES,
} from "@/lib/maintenance/constants";
import type { MaintenanceHistory as History } from "@/lib/maintenance/queries";
import type {
  MaintenanceRecord,
  MaintenanceStaff,
} from "@/lib/maintenance/validation";

type MaintenanceHistoryProps = {
  request: MaintenanceRecord;
  history: History;
  staff: MaintenanceStaff[];
  tenantView?: boolean;
};

function shortDate(value?: string | null): string {
  return formatDate(value?.slice(0, 10));
}

function staffName(staff: MaintenanceStaff[], id?: string | null): string {
  if (!id) return "System";
  const person = staff.find((item) => item.id === id);
  return person?.full_name || person?.email || "Staff member";
}

export function MaintenanceHistory({
  request,
  history,
  staff,
  tenantView = false,
}: MaintenanceHistoryProps) {
  const items = [
    ...history.assignments.map((item) => ({
      id: item.id,
      at: item.created_at ?? "",
      label:
        item.action === "assigned"
          ? `Assigned to ${staffName(staff, item.assigned_to)}`
          : item.action === "reassigned"
            ? `Reassigned to ${staffName(staff, item.assigned_to)}`
            : "Assignment removed",
      note: item.note,
      actor: staffName(staff, item.assigned_by),
      transition: null as string | null,
    })),
    ...history.progress.map((item) => ({
      id: item.id,
      at: item.created_at ?? "",
      label: item.status_to
        ? `Status: ${labelFor(MAINTENANCE_STATUSES, item.status_to)}`
        : "Work note",
      note: item.note,
      actor: staffName(staff, item.updated_by),
      transition:
        item.status_from && item.status_to
          ? `${labelFor(MAINTENANCE_STATUSES, item.status_from)} → ${labelFor(MAINTENANCE_STATUSES, item.status_to)}`
          : null,
    })),
  ].sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));

  return (
    <div className="space-y-4">
      <div className="rounded-lg border p-4">
        <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
          Original report
        </p>
        <p className="mt-1 text-sm text-foreground">{request.description}</p>
        {request.notes && !tenantView ? (
          <p className="mt-2 text-xs text-muted-foreground">Internal notes: {request.notes}</p>
        ) : null}
      </div>

      <ol className="space-y-3">
        {items.map((item) => (
          <li key={item.id} className="rounded-lg border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-danwell-navy">{item.label}</p>
              <p className="text-xs text-muted-foreground">{shortDate(item.at)}</p>
            </div>
            {item.transition ? (
              <p className="mt-1 text-xs text-danwell-teal">{item.transition}</p>
            ) : null}
            <p className="mt-2 text-sm text-muted-foreground">{item.note}</p>
            <p className="mt-2 text-xs text-muted-foreground">By {item.actor}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
