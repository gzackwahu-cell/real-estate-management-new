import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  applicationRowSchema,
  leaseRowSchema,
  tenantListItemSchema,
  tenantRowSchema,
  type ApplicationRecord,
  type ApplicationRow,
  type EmbeddedProperty,
  type EmbeddedUnit,
  type EmbeddedUnitRow,
  type LeaseRecord,
  type LeaseRow,
  type TenantListItem,
  type TenantOption,
  type TenantRecord,
  type UnitOption,
} from "./validation";

export type TenancyClient = SupabaseClient;

export type TenantDetail = {
  tenant: TenantRecord;
  leases: LeaseRecord[];
  applications: ApplicationRecord[];
};

const TENANT_COLUMNS =
  "id, full_name, phone, email, status, created_at";

const TENANT_FULL_COLUMNS =
  "id, profile_id, full_name, phone, email, id_reference, address, emergency_contact_name, emergency_contact_phone, status, created_at";

const TENANT_OPTION_COLUMNS =
  "id, full_name, phone, id_reference, status";

const UNIT_EMBED =
  "id, unit_number, property_id, monthly_rent, occupancy_status, properties(id, title, county, town)";

const TENANT_EMBED =
  "id, full_name, phone, email, status, id_reference";

const APPLICATION_COLUMNS = `
  id, tenant_id, unit_id, applicant_full_name, applicant_phone,
  applicant_email, applicant_id_reference, applicant_address,
  proposed_rent, application_date, notes, status, decision_notes,
  decided_by, decided_at, created_at,
  units(${UNIT_EMBED}),
  tenants(${TENANT_EMBED})
`;

const LEASE_COLUMNS = `
  id, tenant_id, unit_id, source_application_id, start_date, end_date,
  monthly_rent, security_deposit_required, rent_due_day, status,
  special_terms, notes, renewal_of, terminated_on, termination_reason,
  created_at,
  tenants(${TENANT_EMBED}),
  units(${UNIT_EMBED})
`;

const tenantOptionSchema = z.object({
  id: z.uuid(),
  full_name: z.string(),
  phone: z.string(),
  id_reference: z.string(),
  status: z.string(),
});

const unitOptionRowSchema = z.object({
  id: z.uuid(),
  unit_number: z.string(),
  property_id: z.uuid(),
  unit_type: z.string().optional().default("custom"),
  floor: z.string().nullable().optional().transform((v) => v ?? null),
  monthly_rent: z.preprocess(
    (value) => (typeof value === "string" && value.trim() !== "" ? Number(value) : value),
    z.number().refine(Number.isFinite, "Invalid stored number."),
  ),
  occupancy_status: z.string(),
  is_active: z.boolean(),
  deposit_required: z.boolean(),
  properties: z.union([
    z.object({ id: z.uuid(), title: z.string() }),
    z.array(z.object({ id: z.uuid(), title: z.string() })),
  ]).nullish(),
});

function fail(message: string): never {
  throw new Error(message);
}

function firstEmbedded<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
}

function normalizeUnit(row: EmbeddedUnitRow | null | undefined): EmbeddedUnit | null {
  if (!row) {
    return null;
  }

  const property = firstEmbedded(row.properties) as EmbeddedProperty | null;
  return {
    ...row,
    properties: property,
  };
}

function normalizeApplication(row: ApplicationRow): ApplicationRecord {
  return {
    ...row,
    units: normalizeUnit(firstEmbedded(row.units)),
    tenants: firstEmbedded(row.tenants),
  };
}

function normalizeLease(row: LeaseRow): LeaseRecord {
  return {
    ...row,
    units: normalizeUnit(firstEmbedded(row.units)),
    tenants: firstEmbedded(row.tenants),
  };
}

export async function getTenants(
  supabase: TenancyClient,
  status?: string,
): Promise<TenantListItem[]> {
  const { data, error } = status
    ? await supabase
        .from("tenants")
        .select(TENANT_COLUMNS)
        .eq("status", status)
        .order("full_name", { ascending: true })
    : await supabase
        .from("tenants")
        .select(TENANT_COLUMNS)
        .order("full_name", { ascending: true });

  if (error) {
    fail("Unable to load tenants.");
  }

  return z.array(tenantListItemSchema).parse(data ?? []);
}

export async function getTenant(
  supabase: TenancyClient,
  tenantId: string,
): Promise<TenantRecord | null> {
  const { data, error } = await supabase
    .from("tenants")
    .select(TENANT_FULL_COLUMNS)
    .eq("id", tenantId)
    .maybeSingle();

  if (error) {
    fail("Unable to load the tenant.");
  }

  return data ? tenantRowSchema.parse(data) : null;
}

export async function getTenantDetail(
  supabase: TenancyClient,
  tenantId: string,
): Promise<TenantDetail | null> {
  const tenant = await getTenant(supabase, tenantId);
  if (!tenant) {
    return null;
  }

  const [leaseResult, applicationResult] = await Promise.all([
    supabase
      .from("leases")
      .select(LEASE_COLUMNS)
      .eq("tenant_id", tenantId)
      .order("start_date", { ascending: false }),
    supabase
      .from("rental_applications")
      .select(APPLICATION_COLUMNS)
      .eq("tenant_id", tenantId)
      .order("application_date", { ascending: false }),
  ]);

  if (leaseResult.error) {
    fail("Unable to load the tenant's leases.");
  }
  if (applicationResult.error) {
    fail("Unable to load the tenant's applications.");
  }

  return {
    tenant,
    leases: z.array(leaseRowSchema).parse(leaseResult.data ?? []).map(normalizeLease),
    applications: z
      .array(applicationRowSchema)
      .parse(applicationResult.data ?? [])
      .map(normalizeApplication),
  };
}

export async function getTenantOptions(
  supabase: TenancyClient,
  includeTenantId?: string,
): Promise<TenantOption[]> {
  const { data, error } = await supabase
    .from("tenants")
    .select(TENANT_OPTION_COLUMNS)
    .order("full_name", { ascending: true });

  if (error) {
    fail("Unable to load tenant options.");
  }

  return z
    .array(tenantOptionSchema)
    .parse(data ?? [])
    .filter((tenant) => tenant.status === "active" || tenant.id === includeTenantId);
}

export async function getUnitOptions(
  supabase: TenancyClient,
  includeUnitId?: string,
): Promise<UnitOption[]> {
  const { data, error } = await supabase
    .from("units")
    .select("id, unit_number, property_id, unit_type, floor, monthly_rent, occupancy_status, is_active, deposit_required, properties(id, title)")
    .order("unit_number", { ascending: true });

  if (error) {
    fail("Unable to load unit options.");
  }

  return z
    .array(unitOptionRowSchema)
    .parse(data ?? [])
    .filter((unit) => {
      if (!unit.is_active) {
        return false;
      }
      return (
        unit.id === includeUnitId ||
        unit.occupancy_status === "vacant" ||
        unit.occupancy_status === "reserved"
      );
    })
    .map((unit) => {
      const property = firstEmbedded(unit.properties) as { id: string; title: string } | null;
      return {
        id: unit.id,
        unit_number: unit.unit_number,
        property_title: property?.title ?? "Property record",
        monthly_rent: unit.monthly_rent,
        deposit_required: unit.deposit_required,
        occupancy_status: unit.occupancy_status,
        floor: unit.floor ?? null,
        unit_type: unit.unit_type,
      };
    });
}

export async function getApplications(
  supabase: TenancyClient,
  status?: string,
): Promise<ApplicationRecord[]> {
  const { data, error } = status
    ? await supabase
        .from("rental_applications")
        .select(APPLICATION_COLUMNS)
        .eq("status", status)
        .order("application_date", { ascending: false })
    : await supabase
        .from("rental_applications")
        .select(APPLICATION_COLUMNS)
        .order("application_date", { ascending: false });

  if (error) {
    fail("Unable to load rental applications.");
  }

  return z.array(applicationRowSchema).parse(data ?? []).map(normalizeApplication);
}

export async function getApplication(
  supabase: TenancyClient,
  applicationId: string,
): Promise<ApplicationRecord | null> {
  const { data, error } = await supabase
    .from("rental_applications")
    .select(APPLICATION_COLUMNS)
    .eq("id", applicationId)
    .maybeSingle();

  if (error) {
    fail("Unable to load the rental application.");
  }

  return data ? normalizeApplication(applicationRowSchema.parse(data)) : null;
}

export async function getLeases(
  supabase: TenancyClient,
  status?: string,
): Promise<LeaseRecord[]> {
  const { data, error } = status
    ? await supabase
        .from("leases")
        .select(LEASE_COLUMNS)
        .eq("status", status)
        .order("start_date", { ascending: false })
    : await supabase
        .from("leases")
        .select(LEASE_COLUMNS)
        .order("start_date", { ascending: false });

  if (error) {
    fail("Unable to load leases.");
  }

  return z.array(leaseRowSchema).parse(data ?? []).map(normalizeLease);
}

export async function getLease(
  supabase: TenancyClient,
  leaseId: string,
): Promise<LeaseRecord | null> {
  const { data, error } = await supabase
    .from("leases")
    .select(LEASE_COLUMNS)
    .eq("id", leaseId)
    .maybeSingle();

  if (error) {
    fail("Unable to load the lease.");
  }

  return data ? normalizeLease(leaseRowSchema.parse(data)) : null;
}

export async function getPropertyLeases(
  supabase: TenancyClient,
  propertyId: string,
): Promise<LeaseRecord[]> {
  const { data: units, error: unitError } = await supabase
    .from("units")
    .select("id")
    .eq("property_id", propertyId);

  if (unitError) {
    fail("Unable to load property units.");
  }

  const unitIds = (units ?? []).map((unit) => unit.id as string);
  if (unitIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("leases")
    .select(LEASE_COLUMNS)
    .in("unit_id", unitIds)
    .order("start_date", { ascending: false });

  if (error) {
    fail("Unable to load property leases.");
  }

  return z.array(leaseRowSchema).parse(data ?? []).map(normalizeLease);
}

export async function getUnitLeases(
  supabase: TenancyClient,
  unitId: string,
): Promise<LeaseRecord[]> {
  const { data, error } = await supabase
    .from("leases")
    .select(LEASE_COLUMNS)
    .eq("unit_id", unitId)
    .order("start_date", { ascending: false });

  if (error) {
    fail("Unable to load unit leases.");
  }

  return z.array(leaseRowSchema).parse(data ?? []).map(normalizeLease);
}

export async function getTenantPortalData(
  supabase: TenancyClient,
  userId: string,
): Promise<{ tenant: TenantRecord; leases: LeaseRecord[] } | null> {
  const { data, error } = await supabase
    .from("tenants")
    .select(TENANT_FULL_COLUMNS)
    .eq("profile_id", userId)
    .maybeSingle();

  if (error) {
    fail("Unable to load your tenancy profile.");
  }
  if (!data) {
    return null;
  }

  const tenant = tenantRowSchema.parse(data);
  const { data: leaseData, error: leaseError } = await supabase
    .from("leases")
    .select(LEASE_COLUMNS)
    .eq("tenant_id", tenant.id)
    .order("start_date", { ascending: false });

  if (leaseError) {
    fail("Unable to load your leases.");
  }

  return {
    tenant,
    leases: z.array(leaseRowSchema).parse(leaseData ?? []).map(normalizeLease),
  };
}
