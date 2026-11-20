import Link from "next/link";
import { formatDate } from "@/lib/tenancy/constants";
import type { StaffViewing } from "@/lib/listings/staff-queries";
import { StatusPill } from "./status-pill";

export function ViewingTable({ viewings }: { viewings: StaffViewing[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-sm">
        <thead className="border-b text-left text-xs text-muted-foreground">
          <tr>
            <th className="pb-2 pr-4 font-medium">Requester</th>
            <th className="pb-2 pr-4 font-medium">Property</th>
            <th className="pb-2 pr-4 font-medium">Preferred date</th>
            <th className="pb-2 pr-4 font-medium">Time</th>
            <th className="pb-2 pr-4 font-medium">Status</th>
            <th className="pb-2 font-medium">Action</th>
          </tr>
        </thead>
        <tbody>
          {viewings.map((viewing) => (
            <tr key={viewing.id} className="border-b last:border-0">
              <td className="py-3 pr-4">
                <p className="font-medium text-danwell-navy">{viewing.full_name}</p>
                <p className="text-xs text-muted-foreground">{viewing.phone}</p>
              </td>
              <td className="py-3 pr-4">
                {viewing.listings ? (
                  <Link
                    href={`/properties/${viewing.listings.slug}`}
                    className="text-danwell-teal hover:underline"
                  >
                    {viewing.listings.title}
                  </Link>
                ) : (
                  "—"
                )}
              </td>
              <td className="py-3 pr-4">{formatDate(viewing.preferred_date)}</td>
              <td className="py-3 pr-4">{viewing.preferred_time || "Any"}</td>
              <td className="py-3 pr-4">
                <StatusPill
                  label={viewing.status}
                  tone={
                    viewing.status === "cancelled"
                      ? "muted"
                      : viewing.status === "confirmed"
                        ? "positive"
                        : "warning"
                  }
                />
              </td>
              <td className="py-3">
                <Link
                  href={`/dashboard/viewings/${viewing.id}`}
                  className="font-medium text-danwell-teal hover:underline"
                >
                  Manage
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
