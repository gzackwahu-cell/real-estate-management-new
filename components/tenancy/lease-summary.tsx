import Link from "next/link";
import { StatusBadge } from "@/components/portfolio/status-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { labelFor } from "@/lib/portfolio/constants";
import {
  formatDate,
  formatMoney,
  LEASE_STATUSES,
  leaseStatusTone,
} from "@/lib/tenancy/constants";
import type { LeaseRecord } from "@/lib/tenancy/validation";

type LeaseSummaryProps = {
  leases: LeaseRecord[];
  title: string;
  description?: string;
  showTenant?: boolean;
  emptyMessage?: string;
};

export function LeaseSummary({
  leases,
  title,
  description,
  showTenant = false,
  emptyMessage = "No leases in this section.",
}: LeaseSummaryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg text-danwell-navy">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        {leases.length === 0 ? (
          <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
            {emptyMessage}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead className="border-b text-left text-xs text-muted-foreground">
                <tr>
                  <th className="pb-2 font-medium">Lease</th>
                  {showTenant ? <th className="pb-2 font-medium">Tenant</th> : null}
                  <th className="pb-2 font-medium">Unit / property</th>
                  <th className="pb-2 font-medium">Dates</th>
                  <th className="pb-2 font-medium">Monthly rent</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {leases.map((lease) => (
                  <tr key={lease.id} className="border-b last:border-0">
                    <td className="py-3 pr-4 font-medium">
                      <Link
                        href={`/dashboard/leases/${lease.id}`}
                        className="text-danwell-navy hover:underline"
                      >
                        View lease
                      </Link>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Due day {lease.rent_due_day}
                      </p>
                    </td>
                    {showTenant ? (
                      <td className="py-3 pr-4">
                        <Link
                          href={`/dashboard/tenants/${lease.tenant_id}`}
                          className="text-danwell-navy hover:underline"
                        >
                          {lease.tenants?.full_name ?? "Tenant record"}
                        </Link>
                      </td>
                    ) : null}
                    <td className="py-3 pr-4">
                      {lease.units?.unit_number ?? "Unit record"}
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {lease.units?.properties?.title ?? "Property record"}
                      </p>
                    </td>
                    <td className="py-3 pr-4">
                      {formatDate(lease.start_date)} – {formatDate(lease.end_date)}
                    </td>
                    <td className="py-3 pr-4">{formatMoney(lease.monthly_rent)}</td>
                    <td className="py-3 pr-4">
                      <StatusBadge
                        label={labelFor(LEASE_STATUSES, lease.status)}
                        tone={leaseStatusTone(lease.status)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
