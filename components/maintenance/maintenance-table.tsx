import Link from "next/link";
import { StatusBadge } from "@/components/portfolio/status-badge";
import {
  formatDate,
  labelFor,
  MAINTENANCE_CATEGORIES,
  maintenancePriorityTone,
  maintenanceStatusTone,
} from "@/lib/maintenance/constants";
import type { MaintenanceRecord, MaintenanceStaff } from "@/lib/maintenance/validation";

type MaintenanceTableProps = {
  requests: MaintenanceRecord[];
  staff?: MaintenanceStaff[];
  limit?: number;
  tenantView?: boolean;
  hrefBase?: string;
};

export function MaintenanceTable({
  requests,
  staff = [],
  limit,
  tenantView = false,
  hrefBase,
}: MaintenanceTableProps) {
  const rows = typeof limit === "number" ? requests.slice(0, limit) : requests;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="py-2 pr-3 font-medium">Request</th>
            <th className="py-2 pr-3 font-medium">Property / unit</th>
            <th className="py-2 pr-3 font-medium">Category</th>
            <th className="py-2 pr-3 font-medium">Priority</th>
            <th className="py-2 pr-3 font-medium">Status</th>
            <th className="py-2 pr-3 font-medium">Assigned</th>
            <th className="py-2 font-medium">Reported</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((request) => {
            const assigned = staff.find((person) => person.id === request.assigned_to);
            const href = hrefBase
              ? `${hrefBase}/${request.id}`
              : tenantView
                ? `/tenant/maintenance/${request.id}`
                : `/dashboard/maintenance/requests/${request.id}`;

            return (
              <tr key={request.id} className="border-b last:border-0">
                <td className="py-3 pr-3">
                  <Link href={href} className="font-medium text-danwell-navy hover:underline">
                    {request.title}
                  </Link>
                  <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                    {request.description}
                  </p>
                </td>
                <td className="py-3 pr-3">
                  <p>{request.properties?.title ?? "Property record"}</p>
                  <p className="text-xs text-muted-foreground">
                    {request.units?.unit_number ?? "Property-level"}
                  </p>
                </td>
                <td className="py-3 pr-3">
                  {labelFor(MAINTENANCE_CATEGORIES, request.category)}
                </td>
                <td className="py-3 pr-3">
                  <StatusBadge
                    label={request.priority.replace("_", " ")}
                    tone={maintenancePriorityTone(request.priority)}
                  />
                </td>
                <td className="py-3 pr-3">
                  <StatusBadge
                    label={request.status.replace("_", " ")}
                    tone={maintenanceStatusTone(request.status)}
                  />
                </td>
                <td className="py-3 pr-3">
                  {assigned
                    ? assigned.full_name || assigned.email || "Staff member"
                    : request.assigned_to
                      ? "Staff member"
                      : "Unassigned"}
                </td>
                <td className="py-3">{formatDate(request.reported_date)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
