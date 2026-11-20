import Link from "next/link";
import { formatDate } from "@/lib/tenancy/constants";
import type { StaffEnquiry } from "@/lib/listings/staff-queries";
import { StatusPill } from "./status-pill";

export function EnquiryTable({ enquiries }: { enquiries: StaffEnquiry[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-sm">
        <thead className="border-b text-left text-xs text-muted-foreground">
          <tr>
            <th className="pb-2 pr-4 font-medium">Enquirer</th>
            <th className="pb-2 pr-4 font-medium">Property</th>
            <th className="pb-2 pr-4 font-medium">Preferred date</th>
            <th className="pb-2 pr-4 font-medium">Status</th>
            <th className="pb-2 pr-4 font-medium">Received</th>
            <th className="pb-2 font-medium">Action</th>
          </tr>
        </thead>
        <tbody>
          {enquiries.map((enquiry) => (
            <tr key={enquiry.id} className="border-b last:border-0">
              <td className="py-3 pr-4">
                <p className="font-medium text-danwell-navy">{enquiry.full_name}</p>
                <p className="text-xs text-muted-foreground">{enquiry.phone}</p>
              </td>
              <td className="py-3 pr-4">
                {enquiry.listings ? (
                  <Link
                    href={`/properties/${enquiry.listings.slug}`}
                    className="text-danwell-teal hover:underline"
                  >
                    {enquiry.listings.title}
                  </Link>
                ) : (
                  "—"
                )}
              </td>
              <td className="py-3 pr-4">{formatDate(enquiry.preferred_date)}</td>
              <td className="py-3 pr-4">
                <StatusPill
                  label={enquiry.status.replace("_", " ")}
                  tone={
                    enquiry.status === "closed" || enquiry.status === "spam"
                      ? "muted"
                      : enquiry.status === "new"
                        ? "warning"
                        : "positive"
                  }
                />
              </td>
              <td className="py-3 pr-4 text-xs text-muted-foreground">
                {enquiry.created_at ? formatDate(enquiry.created_at.slice(0, 10)) : "—"}
              </td>
              <td className="py-3">
                <Link
                  href={`/dashboard/enquiries/${enquiry.id}`}
                  className="font-medium text-danwell-teal hover:underline"
                >
                  Review
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
