import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  getPropertyDetail,
  getProperties,
  type PropertyDetail,
  type PropertyListItem,
} from "@/lib/portfolio/queries";
import { unitRowSchema, type UnitRecord } from "@/lib/portfolio/validation";
import {
  getMaintenanceRequest,
  getMaintenanceRequestHistory,
  getMaintenanceRequests,
  type MaintenanceHistory,
} from "@/lib/maintenance/queries";
import type { MaintenanceRecord } from "@/lib/maintenance/validation";
import { getPropertyLeases } from "@/lib/tenancy/queries";
import { getPortalNotifications } from "./shared";
import type { MaintenanceNotification } from "@/lib/maintenance/validation";

const numericSchema = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() !== "" ? Number(value) : value,
  z.number().refine(Number.isFinite, "Invalid stored number."),
);

const countSchema = z.preprocess(
  (value) => (value === null || value === undefined ? 0 : Number(value)),
  z.number().int().nonnegative(),
);

const ownershipLinkSchema = z.array(
  z.object({
    owner_id: z.uuid(),
    property_id: z.uuid(),
    verification_status: z.string(),
    ownership_percentage: numericSchema.nullable(),
  }),
);

const ownerFinanceRowSchema = z.array(
  z.object({
    property_id: z.uuid(),
    property_title: z.string(),
    billed: numericSchema,
    collected: numericSchema,
    outstanding: numericSchema,
    deposits_held: numericSchema,
    deposits_outstanding: numericSchema,
    payment_count: countSchema,
    receipt_count: countSchema,
  }),
);

const ownerStatementRowSchema = z.array(
  z.object({
    period_month: z.string(),
    billed: numericSchema,
    collected: numericSchema,
    outstanding: numericSchema,
  }),
);

const ownerTenantRowSchema = z.array(
  z.object({
    property_id: z.uuid(),
    property_title: z.string(),
    unit_id: z.uuid(),
    unit_number: z.string(),
    tenant_id: z.uuid(),
    tenant_name: z.string(),
    tenant_phone: z.string().nullable(),
    lease_id: z.uuid(),
    lease_status: z.string(),
    start_date: z.string(),
    end_date: z.string(),
    monthly_rent: numericSchema,
    rent_due_day: z.number().int(),
  }),
);

export type OwnershipLink = {
  ownerId: string;
  verificationStatus: string;
  ownershipPercentage: number | null;
};

export type OccupancySummary = {
  total: number;
  occupied: number;
  vacant: number;
  reserved: number;
  maintenance: number;
  inactive: number;
  other: number;
  potentialMonthlyRent: number;
};

export type OwnerProperty = Omit<PropertyListItem, "owners"> & {
  occupancy: OccupancySummary;
};

export type OwnerPropertyDetail = Omit<PropertyDetail, "owners">;

export type OwnerFinanceRow = z.infer<typeof ownerFinanceRowSchema>[number];

export type OwnerFinanceTotals = {
  billed: number;
  collected: number;
  outstanding: number;
  depositsHeld: number;
  depositsOutstanding: number;
  paymentCount: number;
  receiptCount: number;
};

export type OwnerTenantRow = z.infer<typeof ownerTenantRowSchema>[number];

export type OwnerStatementRow = z.infer<typeof ownerStatementRowSchema>[number];

function fail(message: string): never {
  throw new Error(message);
}

function summarizeUnits(units: UnitRecord[]): OccupancySummary {
  const summary: OccupancySummary = {
    total: units.length,
    occupied: 0,
    vacant: 0,
    reserved: 0,
    maintenance: 0,
    inactive: 0,
    other: 0,
    potentialMonthlyRent: 0,
  };

  for (const unit of units) {
    if (!unit.is_active) {
      summary.inactive += 1;
      continue;
    }

    summary.potentialMonthlyRent += unit.monthly_rent;
    if (unit.occupancy_status === "occupied") summary.occupied += 1;
    else if (unit.occupancy_status === "vacant") summary.vacant += 1;
    else if (unit.occupancy_status === "reserved") summary.reserved += 1;
    else if (unit.occupancy_status === "maintenance") summary.maintenance += 1;
    else summary.other += 1;
  }

  return summary;
}

/**
 * Only active owner profiles with verified links are returned. Every portal
 * read below starts from this map, so hidden links are never the access control.
 */
export async function getOwnershipMap(
  supabase: SupabaseClient,
  userId: string,
): Promise<Map<string, OwnershipLink>> {
  const { data: ownerRows, error: ownerError } = await supabase
    .from("owners")
    .select("id")
    .eq("profile_id", userId)
    .eq("is_active", true);

  if (ownerError) {
    fail("Unable to verify ownership records.");
  }

  const ownerIds = z
    .array(z.object({ id: z.uuid() }))
    .parse(ownerRows ?? [])
    .map((row) => row.id);

  if (ownerIds.length === 0) {
    return new Map();
  }

  const { data: links, error: linkError } = await supabase
    .from("property_owners")
    .select(
      "owner_id, property_id, verification_status, ownership_percentage",
    )
    .in("owner_id", ownerIds)
    .eq("verification_status", "verified");

  if (linkError) {
    fail("Unable to verify property ownership.");
  }

  const ownership = new Map<string, OwnershipLink>();
  for (const link of ownershipLinkSchema.parse(links ?? [])) {
    if (!ownership.has(link.property_id)) {
      ownership.set(link.property_id, {
        ownerId: link.owner_id,
        verificationStatus: link.verification_status,
        ownershipPercentage: link.ownership_percentage,
      });
    }
  }

  return ownership;
}

async function getOwnerUnits(
  supabase: SupabaseClient,
  propertyIds: string[],
): Promise<UnitRecord[]> {
  if (propertyIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("units")
    .select(
      "id, property_id, unit_number, unit_type, monthly_rent, deposit_required, occupancy_status, is_active, notes",
    )
    .in("property_id", propertyIds);

  if (error) {
    fail("Unable to load owned property units.");
  }

  return z.array(unitRowSchema).parse(data ?? []);
}

export async function loadOwnerPortfolio(
  supabase: SupabaseClient,
  ownership: Map<string, OwnershipLink>,
): Promise<OwnerProperty[]> {
  const propertyIds = Array.from(ownership.keys());
  if (propertyIds.length === 0) {
    return [];
  }

  const [properties, units] = await Promise.all([
    getProperties(supabase),
    getOwnerUnits(supabase, propertyIds),
  ]);

  const unitsByProperty = new Map<string, UnitRecord[]>();
  for (const unit of units) {
    const list = unitsByProperty.get(unit.property_id) ?? [];
    list.push(unit);
    unitsByProperty.set(unit.property_id, list);
  }

  return properties
    .filter((property) => ownership.has(property.id))
    .map((property) => ({
      id: property.id,
      title: property.title,
      description: property.description,
      property_type: property.property_type,
      county: property.county,
      town: property.town,
      estate: property.estate,
      physical_address: property.physical_address,
      directions: property.directions,
      status: property.status,
      created_at: property.created_at,
      occupancy: summarizeUnits(unitsByProperty.get(property.id) ?? []),
    }));
}

export async function loadOwnerPropertyDetail(
  supabase: SupabaseClient,
  ownership: Map<string, OwnershipLink>,
  propertyId: string,
): Promise<OwnerPropertyDetail | null> {
  if (!ownership.has(propertyId)) {
    return null;
  }

  const detail = await getPropertyDetail(supabase, propertyId);
  if (!detail) {
    return null;
  }

  // Co-owner identity references are deliberately omitted from the portal.
  return {
    property: detail.property,
    units: detail.units,
    attachments: detail.attachments,
  };
}

export async function loadOwnerFinanceSummary(
  supabase: SupabaseClient,
  ownership: Map<string, OwnershipLink>,
  propertyId?: string,
): Promise<OwnerFinanceRow[]> {
  if (propertyId && !ownership.has(propertyId)) {
    return [];
  }
  if (ownership.size === 0) {
    return [];
  }

  try {
    const { data, error } = await supabase.rpc("owner_finance_summary", {
      p_property_id: propertyId ?? null,
    });
    if (error) {
      return [];
    }

    return ownerFinanceRowSchema
      .parse(data ?? [])
      .filter(
        (row) =>
          ownership.has(row.property_id) &&
          (!propertyId || row.property_id === propertyId),
      );
  } catch {
    return [];
  }
}

export function summarizeOwnerFinance(
  rows: OwnerFinanceRow[],
): OwnerFinanceTotals {
  return rows.reduce<OwnerFinanceTotals>(
    (totals, row) => ({
      billed: totals.billed + row.billed,
      collected: totals.collected + row.collected,
      outstanding: totals.outstanding + row.outstanding,
      depositsHeld: totals.depositsHeld + row.deposits_held,
      depositsOutstanding: totals.depositsOutstanding + row.deposits_outstanding,
      paymentCount: totals.paymentCount + row.payment_count,
      receiptCount: totals.receiptCount + row.receipt_count,
    }),
    {
      billed: 0,
      collected: 0,
      outstanding: 0,
      depositsHeld: 0,
      depositsOutstanding: 0,
      paymentCount: 0,
      receiptCount: 0,
    },
  );
}

export async function loadOwnerStatement(
  supabase: SupabaseClient,
  ownership: Map<string, OwnershipLink>,
  propertyId: string,
  period?: string,
): Promise<OwnerStatementRow[]> {
  if (!ownership.has(propertyId)) {
    return [];
  }

  try {
    const { data, error } = await supabase.rpc("owner_financial_statement", {
      p_property_id: propertyId,
      p_period: period ?? null,
    });
    if (error) {
      return [];
    }
    return ownerStatementRowSchema.parse(data ?? []);
  } catch {
    return [];
  }
}

export async function loadOwnerTenantOverview(
  supabase: SupabaseClient,
  ownership: Map<string, OwnershipLink>,
  propertyId?: string,
): Promise<OwnerTenantRow[]> {
  if (propertyId && !ownership.has(propertyId)) {
    return [];
  }
  if (ownership.size === 0) {
    return [];
  }

  try {
    const { data, error } = await supabase.rpc("owner_tenant_overview", {
      p_property_id: propertyId ?? null,
    });
    if (!error) {
      return ownerTenantRowSchema
        .parse(data ?? [])
        .filter(
          (row) =>
            ownership.has(row.property_id) &&
            (!propertyId || row.property_id === propertyId),
        );
    }
  } catch {
    // Fall through to the scoped direct-read fallback below.
  }

  // Staff accounts may preview the curated overview before the owner RPC is
  // applied. Only fields shown here are ever rendered by the portal.
  const targetIds = propertyId ? [propertyId] : Array.from(ownership.keys());
  const leasesByProperty = await Promise.all(
    targetIds.map((id) => getPropertyLeases(supabase, id).catch(() => [])),
  );

  return leasesByProperty.flat().map((lease) => ({
    property_id: lease.units?.property_id ?? "",
    property_title: lease.units?.properties?.title ?? "Property",
    unit_id: lease.unit_id,
    unit_number: lease.units?.unit_number ?? "Unit",
    tenant_id: lease.tenant_id,
    tenant_name: lease.tenants?.full_name ?? "Tenant",
    tenant_phone: lease.tenants?.phone ?? null,
    lease_id: lease.id,
    lease_status: lease.status,
    start_date: lease.start_date,
    end_date: lease.end_date,
    monthly_rent: lease.monthly_rent,
    rent_due_day: lease.rent_due_day,
  }));
}

export async function loadOwnerMaintenance(
  supabase: SupabaseClient,
  ownership: Map<string, OwnershipLink>,
  propertyId?: string,
): Promise<MaintenanceRecord[]> {
  if (propertyId && !ownership.has(propertyId)) {
    return [];
  }
  if (ownership.size === 0) {
    return [];
  }

  try {
    const requests = await getMaintenanceRequests(
      supabase,
      propertyId ? { propertyId } : {},
    );
    return requests.filter(
      (request) =>
        ownership.has(request.property_id) &&
        (!propertyId || request.property_id === propertyId),
    );
  } catch {
    return [];
  }
}

export async function loadOwnerMaintenanceRequest(
  supabase: SupabaseClient,
  ownership: Map<string, OwnershipLink>,
  requestId: string,
): Promise<{
  request: MaintenanceRecord;
  history: MaintenanceHistory;
} | null> {
  try {
    const request = await getMaintenanceRequest(supabase, requestId);
    if (!request || !ownership.has(request.property_id)) {
      return null;
    }

    const history = await getMaintenanceRequestHistory(supabase, requestId).catch(
      () => ({ assignments: [], progress: [] }),
    );
    return { request, history };
  } catch {
    return null;
  }
}

export type OwnerPortalData = {
  ownership: Map<string, OwnershipLink>;
  properties: OwnerProperty[];
  finance: OwnerFinanceRow[];
  tenants: OwnerTenantRow[];
  maintenance: MaintenanceRecord[];
  notifications: MaintenanceNotification[];
};

export async function loadOwnerPortal(
  supabase: SupabaseClient,
  userId: string,
): Promise<OwnerPortalData> {
  const ownership = await getOwnershipMap(supabase, userId);
  const properties = await loadOwnerPortfolio(supabase, ownership);

  const [finance, tenants, maintenance, notifications] = await Promise.all([
    loadOwnerFinanceSummary(supabase, ownership),
    loadOwnerTenantOverview(supabase, ownership),
    loadOwnerMaintenance(supabase, ownership),
    getPortalNotifications(supabase),
  ]);

  return {
    ownership,
    properties,
    finance,
    tenants,
    maintenance,
    notifications,
  };
}
