import Link from "next/link";
import { StatusBadge } from "@/components/portfolio/status-badge";
import {
  labelFor,
  OCCUPANCY_STATUSES,
  PROPERTY_STATUSES,
  PROPERTY_TYPES,
  UNIT_TYPES,
} from "@/lib/portfolio/constants";
import type { UnitRecord } from "@/lib/portfolio/validation";
import {
  formatDate,
  formatMoney,
  isCurrentLeaseStatus,
  LEASE_STATUSES,
  leaseStatusTone,
} from "@/lib/tenancy/constants";
import type {
  OwnerFinanceRow,
  OwnerProperty,
  OwnerTenantRow,
} from "@/lib/portal/owner";

export function OwnerPropertyTable({
  properties,
}: {
  properties: OwnerProperty[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-sm">
        <thead className="border-b text-left text-xs text-muted-foreground">
          <tr>
            <th className="pb-2 pr-4 font-medium">Property</th>
            <th className="pb-2 pr-4 font-medium">Location</th>
            <th className="pb-2 pr-4 font-medium">Type</th>
            <th className="pb-2 pr-4 font-medium">Occupancy</th>
            <th className="pb-2 pr-4 text-right font-medium">Potential rent</th>
            <th className="pb-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {properties.map((property) => (
            <tr key={property.id} className="border-b last:border-0">
              <td className="py-3 pr-4">
                <Link
                  href={`/owner/properties/${property.id}`}
                  className="font-medium text-danwell-navy hover:underline"
                >
                  {property.title}
                </Link>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {property.occupancy.total} unit(s)
                </p>
              </td>
              <td className="py-3 pr-4">
                {property.town}, {property.county}
              </td>
              <td className="py-3 pr-4">
                {labelFor(PROPERTY_TYPES, property.property_type)}
              </td>
              <td className="py-3 pr-4">
                <p>
                  {property.occupancy.occupied} occupied ·{" "}
                  {property.occupancy.vacant} vacant
                </p>
                <p className="text-xs text-muted-foreground">
                  {property.occupancy.reserved} reserved ·{" "}
                  {property.occupancy.maintenance} in maintenance
                </p>
              </td>
              <td className="py-3 pr-4 text-right font-medium">
                {formatMoney(property.occupancy.potentialMonthlyRent)}
              </td>
              <td className="py-3">
                <StatusBadge
                  label={labelFor(PROPERTY_STATUSES, property.status)}
                  tone={
                    property.status === "active"
                      ? "positive"
                      : property.status === "maintenance"
                        ? "warning"
                        : "muted"
                  }
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function OwnerUnitTable({ units }: { units: UnitRecord[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[620px] text-sm">
        <thead className="border-b text-left text-xs text-muted-foreground">
          <tr>
            <th className="pb-2 pr-4 font-medium">Unit</th>
            <th className="pb-2 pr-4 font-medium">Type</th>
            <th className="pb-2 pr-4 text-right font-medium">Monthly rent</th>
            <th className="pb-2 pr-4 font-medium">Deposit</th>
            <th className="pb-2 pr-4 font-medium">Occupancy</th>
            <th className="pb-2 font-medium">Record</th>
          </tr>
        </thead>
        <tbody>
          {units.map((unit) => (
            <tr key={unit.id} className="border-b last:border-0">
              <td className="py-3 pr-4 font-medium">{unit.unit_number}</td>
              <td className="py-3 pr-4">{labelFor(UNIT_TYPES, unit.unit_type)}</td>
              <td className="py-3 pr-4 text-right">
                {formatMoney(unit.monthly_rent)}
              </td>
              <td className="py-3 pr-4">
                {unit.deposit_required ? "Required" : "Not required"}
              </td>
              <td className="py-3 pr-4">
                <StatusBadge
                  label={labelFor(OCCUPANCY_STATUSES, unit.occupancy_status)}
                  tone={
                    unit.occupancy_status === "occupied"
                      ? "positive"
                      : unit.occupancy_status === "vacant"
                        ? "neutral"
                        : "warning"
                  }
                />
              </td>
              <td className="py-3 text-muted-foreground">
                {unit.is_active ? "Active" : "Inactive"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function OwnerTenantTable({ rows }: { rows: OwnerTenantRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] text-sm">
        <thead className="border-b text-left text-xs text-muted-foreground">
          <tr>
            <th className="pb-2 pr-4 font-medium">Property / unit</th>
            <th className="pb-2 pr-4 font-medium">Tenant</th>
            <th className="pb-2 pr-4 font-medium">Contact</th>
            <th className="pb-2 pr-4 font-medium">Lease term</th>
            <th className="pb-2 pr-4 text-right font-medium">Monthly rent</th>
            <th className="pb-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.lease_id} className="border-b last:border-0">
              <td className="py-3 pr-4">
                <Link
                  href={`/owner/properties/${row.property_id}`}
                  className="font-medium text-danwell-navy hover:underline"
                >
                  {row.property_title}
                </Link>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {row.unit_number}
                </p>
              </td>
              <td className="py-3 pr-4">{row.tenant_name}</td>
              <td className="py-3 pr-4">
                {row.tenant_phone ?? "Not provided"}
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Rent due day {row.rent_due_day}
                </p>
              </td>
              <td className="py-3 pr-4">
                {formatDate(row.start_date)} – {formatDate(row.end_date)}
              </td>
              <td className="py-3 pr-4 text-right font-medium">
                {formatMoney(row.monthly_rent)}
              </td>
              <td className="py-3">
                <StatusBadge
                  label={labelFor(LEASE_STATUSES, row.lease_status)}
                  tone={
                    isCurrentLeaseStatus(row.lease_status)
                      ? "positive"
                      : leaseStatusTone(row.lease_status)
                  }
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function OwnerFinanceTable({ rows }: { rows: OwnerFinanceRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] text-sm">
        <thead className="border-b text-left text-xs text-muted-foreground">
          <tr>
            <th className="pb-2 pr-4 font-medium">Property</th>
            <th className="pb-2 pr-4 text-right font-medium">Billed</th>
            <th className="pb-2 pr-4 text-right font-medium">Collected</th>
            <th className="pb-2 pr-4 text-right font-medium">Outstanding</th>
            <th className="pb-2 pr-4 text-right font-medium">Deposits held</th>
            <th className="pb-2 pr-4 text-right font-medium">Payments</th>
            <th className="pb-2 text-right font-medium">Receipts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.property_id} className="border-b last:border-0">
              <td className="py-3 pr-4">
                <Link
                  href={`/owner/finance?propertyId=${row.property_id}`}
                  className="font-medium text-danwell-navy hover:underline"
                >
                  {row.property_title}
                </Link>
              </td>
              <td className="py-3 pr-4 text-right">{formatMoney(row.billed)}</td>
              <td className="py-3 pr-4 text-right">
                {formatMoney(row.collected)}
              </td>
              <td className="py-3 pr-4 text-right font-medium">
                {formatMoney(row.outstanding)}
              </td>
              <td className="py-3 pr-4 text-right">
                {formatMoney(row.deposits_held)}
              </td>
              <td className="py-3 pr-4 text-right">{row.payment_count}</td>
              <td className="py-3 text-right">{row.receipt_count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
