import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  expenseRowSchema,
  firstEmbedded,
  maintenanceAssignmentRowSchema,
  maintenanceProgressRowSchema,
  maintenanceRequestRowSchema,
  notificationRowSchema,
  staffRowSchema,
  type ExpenseRecord,
  type MaintenanceAssignmentRecord,
  type MaintenanceNotification,
  type MaintenanceProgressRecord,
  type MaintenanceRecord,
  type MaintenanceStaff,
} from "./validation";

export type MaintenanceClient = SupabaseClient;

export type MaintenanceFilters = {
  propertyId?: string;
  unitId?: string;
  status?: string;
  priority?: string;
  assignedTo?: string;
  tenantId?: string;
};

export type ExpenseFilters = {
  propertyId?: string;
  maintenanceRequestId?: string;
  paymentStatus?: string;
};

export type MaintenanceSummary = {
  total: number;
  open: number;
  highPriority: number;
  completed: number;
  expenseTotal: number;
  unpaidExpenses: number;
};

export type MaintenanceFilterOptions = {
  properties: { id: string; title: string }[];
  units: { id: string; unit_number: string; property_id: string; property_title: string }[];
  tenants: { id: string; full_name: string; phone: string | null }[];
  staff: MaintenanceStaff[];
};

export type MaintenanceHistory = {
  assignments: MaintenanceAssignmentRecord[];
  progress: MaintenanceProgressRecord[];
};

const MAINTENANCE_REQUEST_COLUMNS = `
  id, property_id, unit_id, tenant_id, reported_by_profile,
  title, description, category, priority, status, reported_date,
  tenant_contact, assigned_to, assigned_at, completed_at, resolution,
  notes, created_by, updated_by, created_at, updated_at,
  properties(id, title),
  units(id, unit_number, property_id),
  tenants(id, full_name, phone, email)
`;

const EXPENSE_COLUMNS = `
  id, property_id, maintenance_request_id, category, vendor, description,
  amount, payment_status, expense_date, reference, created_by, updated_by,
  created_at, updated_at,
  properties(id, title),
  maintenance_requests(id, title)
`;

function fail(message: string): never {
  throw new Error(message);
}

function normalizeRequest(data: unknown): MaintenanceRecord {
  const row = maintenanceRequestRowSchema.parse(data);
  const unit = firstEmbedded(row.units);
  return {
    ...row,
    properties: firstEmbedded(row.properties),
    units: unit ? { ...unit, property_id: unit.property_id ?? row.property_id } : null,
    tenants: firstEmbedded(row.tenants),
  };
}

function normalizeExpense(data: unknown): ExpenseRecord {
  const row = expenseRowSchema.parse(data);
  return {
    ...row,
    properties: firstEmbedded(row.properties),
    maintenance_requests: firstEmbedded(row.maintenance_requests),
  };
}

export async function getMaintenanceRequests(
  supabase: MaintenanceClient,
  filters: MaintenanceFilters = {},
): Promise<MaintenanceRecord[]> {
  let query = supabase
    .from("maintenance_requests")
    .select(MAINTENANCE_REQUEST_COLUMNS);

  if (filters.propertyId) query = query.eq("property_id", filters.propertyId);
  if (filters.unitId) query = query.eq("unit_id", filters.unitId);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.priority) query = query.eq("priority", filters.priority);
  if (filters.assignedTo) query = query.eq("assigned_to", filters.assignedTo);
  if (filters.tenantId) query = query.eq("tenant_id", filters.tenantId);

  const { data, error } = await query
    .order("reported_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    fail("Unable to load maintenance requests.");
  }

  return z.array(z.unknown()).parse(data ?? []).map(normalizeRequest);
}

export async function getMaintenanceRequest(
  supabase: MaintenanceClient,
  requestId: string,
): Promise<MaintenanceRecord | null> {
  const { data, error } = await supabase
    .from("maintenance_requests")
    .select(MAINTENANCE_REQUEST_COLUMNS)
    .eq("id", requestId)
    .maybeSingle();

  if (error) {
    fail("Unable to load the maintenance request.");
  }
  if (!data) {
    return null;
  }
  return normalizeRequest(data);
}

export async function getMaintenanceRequestHistory(
  supabase: MaintenanceClient,
  requestId: string,
): Promise<MaintenanceHistory> {
  const [assignments, progress] = await Promise.all([
    supabase
      .from("maintenance_assignments")
      .select("id, request_id, assigned_to, assigned_by, action, note, created_at")
      .eq("request_id", requestId)
      .order("created_at", { ascending: false }),
    supabase
      .from("maintenance_progress_updates")
      .select("id, request_id, note, status_from, status_to, updated_by, created_at")
      .eq("request_id", requestId)
      .order("created_at", { ascending: false }),
  ]);

  if (assignments.error) {
    fail("Unable to load assignment history.");
  }
  if (progress.error) {
    fail("Unable to load progress updates.");
  }

  return {
    assignments: z.array(maintenanceAssignmentRowSchema).parse(assignments.data ?? []),
    progress: z.array(maintenanceProgressRowSchema).parse(progress.data ?? []),
  };
}

export async function getMaintenanceExpenses(
  supabase: MaintenanceClient,
  filters: ExpenseFilters = {},
): Promise<ExpenseRecord[]> {
  let query = supabase.from("expenses").select(EXPENSE_COLUMNS);

  if (filters.propertyId) query = query.eq("property_id", filters.propertyId);
  if (filters.maintenanceRequestId) {
    query = query.eq("maintenance_request_id", filters.maintenanceRequestId);
  }
  if (filters.paymentStatus) query = query.eq("payment_status", filters.paymentStatus);

  const { data, error } = await query
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    fail("Unable to load maintenance expenses.");
  }

  return z.array(z.unknown()).parse(data ?? []).map(normalizeExpense);
}

export async function getMaintenanceSummary(
  supabase: MaintenanceClient,
  filters: MaintenanceFilters = {},
): Promise<MaintenanceSummary> {
  const [requests, expenseResult] = await Promise.all([
    getMaintenanceRequests(supabase, filters),
    getMaintenanceExpenses(
      supabase,
      filters.propertyId ? { propertyId: filters.propertyId } : {},
    ).catch(() => [] as ExpenseRecord[]),
  ]);
  const expenses = expenseResult;

  return {
    total: requests.length,
    open: requests.filter(
      (request) => request.status !== "completed" && request.status !== "cancelled",
    ).length,
    highPriority: requests.filter(
      (request) => request.priority === "high" || request.priority === "emergency",
    ).length,
    completed: requests.filter((request) => request.status === "completed").length,
    expenseTotal: expenses.reduce((sum, expense) => sum + Number(expense.amount), 0),
    unpaidExpenses: expenses
      .filter((expense) => expense.payment_status !== "paid")
      .reduce((sum, expense) => sum + Number(expense.amount), 0),
  };
}

const propertyOptionSchema = z.array(z.object({ id: z.uuid(), title: z.string() }));
const unitOptionSchema = z.array(
  z.object({
    id: z.uuid(),
    unit_number: z.string(),
    property_id: z.uuid(),
    properties: z
      .union([
        z.object({ id: z.uuid(), title: z.string() }),
        z.array(z.object({ id: z.uuid(), title: z.string() })),
      ])
      .nullish(),
  }),
);
const tenantOptionSchema = z.array(
  z.object({
    id: z.uuid(),
    full_name: z.string(),
    phone: z.string().nullable().optional(),
  }),
);

export async function getStaffDirectory(
  supabase: MaintenanceClient,
): Promise<MaintenanceStaff[]> {
  const { data, error } = await supabase.rpc("list_maintenance_staff");
  if (error) {
    return [];
  }
  return z.array(staffRowSchema).parse(data ?? []);
}

export async function getMaintenanceFilterOptions(
  supabase: MaintenanceClient,
): Promise<MaintenanceFilterOptions> {
  const [properties, units, tenants, staff] = await Promise.all([
    supabase.from("properties").select("id, title").order("title", { ascending: true }),
    supabase
      .from("units")
      .select("id, unit_number, property_id, properties(id, title)")
      .order("unit_number", { ascending: true }),
    supabase
      .from("tenants")
      .select("id, full_name, phone")
      .order("full_name", { ascending: true }),
    getStaffDirectory(supabase),
  ]);

  if (properties.error) fail("Unable to load property options.");
  if (units.error) fail("Unable to load unit options.");
  if (tenants.error) fail("Unable to load tenant options.");

  return {
    properties: propertyOptionSchema.parse(properties.data ?? []),
    units: unitOptionSchema.parse(units.data ?? []).map((unit) => ({
      id: unit.id,
      unit_number: unit.unit_number,
      property_id: unit.property_id,
      property_title: firstEmbedded(unit.properties)?.title ?? "Property record",
    })),
    tenants: tenantOptionSchema.parse(tenants.data ?? []).map((tenant) => ({
      id: tenant.id,
      full_name: tenant.full_name,
      phone: tenant.phone ?? null,
    })),
    staff,
  };
}

export async function getMaintenanceNotifications(
  supabase: MaintenanceClient,
  limit = 8,
): Promise<MaintenanceNotification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("id, event_type, title, message, entity_type, entity_id, link, created_at, status")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return [];
  }
  return z.array(notificationRowSchema).parse(data ?? []);
}
