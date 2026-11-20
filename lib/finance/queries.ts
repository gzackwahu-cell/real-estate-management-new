import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  adjustmentRowSchema,
  allocationRowSchema,
  auditRowSchema,
  chargeRowSchema,
  depositRowSchema,
  depositTransactionRowSchema,
  embeddedLeaseSchema,
  paymentMethodSchema,
  paymentRowSchema,
  receiptRowSchema,
  reversalRowSchema,
  type AdjustmentRecord,
  type AllocationRecord,
  type AuditRecord,
  type ChargeRecord,
  type DepositRecord,
  type DepositTransactionRecord,
  type EmbeddedLease,
  type EmbeddedLeaseRow,
  type PaymentMethod,
  type PaymentRecord,
  type ReceiptRecord,
  type ReversalRecord,
} from "./validation";

export type FinanceClient = SupabaseClient;

export type FinanceFilters = {
  period?: string;
  propertyId?: string;
  unitId?: string;
  tenantId?: string;
  leaseId?: string;
};

export type ChargeWithBalance = ChargeRecord & {
  effective_amount: number;
  allocated_amount: number;
  balance: number;
  payment_state: "paid" | "partial" | "outstanding";
};

export type PaymentWithCredit = PaymentRecord & {
  effective_amount: number;
  allocated_amount: number;
  unallocated_amount: number;
};

export type DepositWithBalance = DepositRecord & {
  held_amount: number;
  outstanding_amount: number;
};

export type FinanceLedger = {
  charges: ChargeWithBalance[];
  payments: PaymentWithCredit[];
  allocations: AllocationRecord[];
  adjustments: AdjustmentRecord[];
  reversals: ReversalRecord[];
  deposits: DepositWithBalance[];
  depositTransactions: DepositTransactionRecord[];
  receipts: ReceiptRecord[];
};

export type FinanceSummary = {
  totalBilled: number;
  totalCollected: number;
  outstandingRent: number;
  partiallyPaidCharges: number;
  unallocatedPayments: number;
  depositsHeld: number;
  depositsOutstanding: number;
};

const LEASE_EMBED = `
  id, tenant_id, unit_id, status, monthly_rent, rent_due_day, deposit_amount,
  tenants(id, full_name, phone, email),
  units(id, unit_number, property_id, properties(id, title))
`;

const CHARGE_COLUMNS = `
  id, lease_id, period_month, period_start, period_end, due_date, amount,
  source, notes, created_at,
  leases(${LEASE_EMBED})
`;

const PAYMENT_COLUMNS = `
  id, tenant_id, lease_id, payment_type, payment_method_id, amount,
  payment_date, transaction_reference, notes, created_at,
  payment_methods(code, name),
  tenants(id, full_name, phone, email),
  leases(${LEASE_EMBED}),
  receipts(id, receipt_number)
`;

const DEPOSIT_COLUMNS = `
  id, lease_id, required_amount, notes, created_at,
  leases(${LEASE_EMBED})
`;

const RECEIPT_COLUMNS = `
  id, receipt_number, payment_id, issued_at, issued_by, notes,
  payments(
    id, tenant_id, lease_id, payment_type, amount, payment_date,
    transaction_reference,
    payment_methods(code, name),
    tenants(id, full_name, phone, email),
    leases(${LEASE_EMBED})
  )
`;

function fail(message: string): never {
  throw new Error(message);
}

function firstEmbedded<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
}

function toCents(value: number | string): number {
  const text = typeof value === "number" ? value.toFixed(2) : String(value);
  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(text.trim());
  if (!match) {
    return 0;
  }
  const sign = match[1] === "-" ? -1 : 1;
  const fraction = (match[3] ?? "").padEnd(2, "0");
  return sign * (Number(match[2]) * 100 + Number(fraction));
}

function fromCents(cents: number): number {
  return cents / 100;
}

function normalizeLease(row: unknown): EmbeddedLease | null {
  const candidate = firstEmbedded(
    row as EmbeddedLeaseRow | EmbeddedLeaseRow[] | null | undefined,
  );
  if (!candidate) {
    return null;
  }
  const parsed = embeddedLeaseSchema.safeParse(candidate);
  if (!parsed.success) {
    return null;
  }
  const lease = parsed.data;
  const tenant = firstEmbedded(lease.tenants);
  const unit = firstEmbedded(lease.units);
  const property = unit ? firstEmbedded(unit.properties) : null;

  return {
    id: lease.id,
    tenant_id: lease.tenant_id,
    unit_id: lease.unit_id,
    status: lease.status,
    monthly_rent: lease.monthly_rent,
    rent_due_day: lease.rent_due_day,
    deposit_amount: lease.deposit_amount,
    tenants: tenant ?? null,
    units: unit
      ? {
          id: unit.id,
          unit_number: unit.unit_number,
          property_id: unit.property_id ?? property?.id,
          properties: property ?? null,
        }
      : null,
  };
}

function matchesScope(lease: EmbeddedLease | null, filters: FinanceFilters): boolean {
  const hasScope = Boolean(
    filters.propertyId || filters.unitId || filters.tenantId || filters.leaseId,
  );
  if (!hasScope) {
    return true;
  }
  if (!lease) {
    return false;
  }
  if (filters.leaseId && lease.id !== filters.leaseId) return false;
  if (filters.tenantId && lease.tenant_id !== filters.tenantId) return false;
  if (filters.unitId && lease.unit_id !== filters.unitId) return false;
  if (
    filters.propertyId &&
    lease.units?.property_id !== filters.propertyId &&
    lease.units?.properties?.id !== filters.propertyId
  ) {
    return false;
  }
  return true;
}

function inPeriod(date: string | null | undefined, period?: string): boolean {
  if (!period) {
    return true;
  }
  return date?.slice(0, 7) === period;
}

export async function getPaymentMethods(
  supabase: FinanceClient,
): Promise<PaymentMethod[]> {
  const { data, error } = await supabase
    .from("payment_methods")
    .select("id, code, name, requires_reference, is_active")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    fail("Unable to load payment methods.");
  }
  return z.array(paymentMethodSchema).parse(data ?? []);
}

export async function getCharges(
  supabase: FinanceClient,
  filters: FinanceFilters = {},
): Promise<ChargeRecord[]> {
  const { data, error } = await supabase
    .from("rent_charges")
    .select(CHARGE_COLUMNS)
    .order("period_start", { ascending: false });

  if (error) {
    fail("Unable to load rent charges.");
  }

  return z
    .array(chargeRowSchema)
    .parse(data ?? [])
    .map((row) => ({
      ...row,
      leases: normalizeLease(row.leases),
    }))
    .filter(
      (row) => inPeriod(row.period_month, filters.period) && matchesScope(row.leases, filters),
    );
}

export async function getPayments(
  supabase: FinanceClient,
  filters: FinanceFilters = {},
): Promise<PaymentRecord[]> {
  const { data, error } = await supabase
    .from("payments")
    .select(PAYMENT_COLUMNS)
    .order("payment_date", { ascending: false });

  if (error) {
    fail("Unable to load payments.");
  }

  return z
    .array(paymentRowSchema)
    .parse(data ?? [])
    .map((row) => ({
      ...row,
      payment_methods: firstEmbedded(row.payment_methods),
      tenants: firstEmbedded(row.tenants),
      leases: normalizeLease(row.leases),
      receipts: firstEmbedded(row.receipts),
    }))
    .filter(
      (row) => inPeriod(row.payment_date, filters.period) && matchesScope(row.leases, filters),
    );
}

export async function getAllocations(
  supabase: FinanceClient,
): Promise<AllocationRecord[]> {
  const { data, error } = await supabase
    .from("payment_allocations")
    .select("id, payment_id, charge_id, amount, allocated_at")
    .order("allocated_at", { ascending: false });

  if (error) {
    fail("Unable to load payment allocations.");
  }
  return z.array(allocationRowSchema).parse(data ?? []);
}

export async function getAdjustments(
  supabase: FinanceClient,
): Promise<AdjustmentRecord[]> {
  const { data, error } = await supabase
    .from("allocation_adjustments")
    .select(
      "id, payment_id, charge_id, allocation_id, adjustment_type, amount_delta, reason, created_by, created_at",
    )
    .order("created_at", { ascending: false });

  if (error) {
    fail("Unable to load financial adjustments.");
  }
  return z.array(adjustmentRowSchema).parse(data ?? []);
}

export async function getReversals(
  supabase: FinanceClient,
): Promise<ReversalRecord[]> {
  const { data, error } = await supabase
    .from("payment_reversals")
    .select("id, payment_id, amount, reason, created_by, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    fail("Unable to load payment reversals.");
  }
  return z.array(reversalRowSchema).parse(data ?? []);
}

export async function getDeposits(
  supabase: FinanceClient,
  filters: FinanceFilters = {},
): Promise<DepositRecord[]> {
  const { data, error } = await supabase
    .from("deposits")
    .select(DEPOSIT_COLUMNS)
    .order("created_at", { ascending: false });

  if (error) {
    fail("Unable to load deposits.");
  }

  return z
    .array(depositRowSchema)
    .parse(data ?? [])
    .map((row) => ({ ...row, leases: normalizeLease(row.leases) }))
    .filter((row) => matchesScope(row.leases, filters));
}

export async function getDepositTransactions(
  supabase: FinanceClient,
): Promise<DepositTransactionRecord[]> {
  const { data, error } = await supabase
    .from("deposit_transactions")
    .select(
      "id, deposit_id, transaction_type, amount, transaction_date, payment_id, transaction_reference, reason, created_by, created_at, payment_methods(code, name)",
    )
    .order("transaction_date", { ascending: false });

  if (error) {
    fail("Unable to load deposit transactions.");
  }

  return z
    .array(depositTransactionRowSchema)
    .parse(data ?? [])
    .map((row) => ({ ...row, payment_methods: firstEmbedded(row.payment_methods) }));
}

export async function getReceipts(
  supabase: FinanceClient,
  filters: FinanceFilters = {},
): Promise<ReceiptRecord[]> {
  const { data, error } = await supabase
    .from("receipts")
    .select(RECEIPT_COLUMNS)
    .order("issued_at", { ascending: false });

  if (error) {
    fail("Unable to load receipts.");
  }

  return z
    .array(receiptRowSchema)
    .parse(data ?? [])
    .map((row) => {
      const payment = firstEmbedded(row.payments);
      return {
        ...row,
        payments: payment
          ? {
              ...payment,
              payment_methods: firstEmbedded(payment.payment_methods),
              tenants: firstEmbedded(payment.tenants),
              leases: normalizeLease(payment.leases),
            }
          : null,
      };
    })
    .filter((row) => {
      if (!row.payments) return false;
      return (
        inPeriod(row.payments.payment_date, filters.period) &&
        matchesScope(row.payments.leases, filters)
      );
    });
}

export async function getReceipt(
  supabase: FinanceClient,
  receiptId: string,
): Promise<ReceiptRecord | null> {
  const receipts = await getReceipts(supabase);
  return receipts.find((receipt) => receipt.id === receiptId) ?? null;
}

export async function getAuditLog(
  supabase: FinanceClient,
  options: { entityType?: string; entityId?: string } = {},
): Promise<AuditRecord[]> {
  let query = supabase
    .from("audit_log")
    .select("id, entity_type, entity_id, action, reason, actor_email, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (options.entityType) {
    query = query.eq("entity_type", options.entityType);
  }
  if (options.entityId) {
    query = query.eq("entity_id", options.entityId);
  }

  const { data, error } = await query;
  if (error) {
    fail("Unable to load the financial audit trail.");
  }
  return z.array(auditRowSchema).parse(data ?? []);
}

export function calculateChargeBalances(
  charges: ChargeRecord[],
  allocations: AllocationRecord[],
  adjustments: AdjustmentRecord[],
): ChargeWithBalance[] {
  return charges.map((charge) => {
    let effectiveCents = toCents(charge.amount);
    for (const adjustment of adjustments) {
      if (
        adjustment.charge_id === charge.id &&
        adjustment.adjustment_type === "charge_adjustment"
      ) {
        effectiveCents += toCents(adjustment.amount_delta);
      }
    }

    let allocatedCents = 0;
    for (const allocation of allocations) {
      if (allocation.charge_id === charge.id) {
        allocatedCents += toCents(allocation.amount);
      }
    }

    const balanceCents = effectiveCents - allocatedCents;
    return {
      ...charge,
      effective_amount: fromCents(effectiveCents),
      allocated_amount: fromCents(allocatedCents),
      balance: fromCents(balanceCents),
      payment_state:
        balanceCents <= 0 && effectiveCents > 0
          ? "paid"
          : allocatedCents > 0
            ? "partial"
            : "outstanding",
    };
  });
}

export function calculatePaymentCredits(
  payments: PaymentRecord[],
  allocations: AllocationRecord[],
  reversals: ReversalRecord[],
): PaymentWithCredit[] {
  return payments.map((payment) => {
    let effectiveCents = toCents(payment.amount);
    for (const reversal of reversals) {
      if (reversal.payment_id === payment.id) {
        effectiveCents -= toCents(reversal.amount);
      }
    }

    let allocatedCents = 0;
    for (const allocation of allocations) {
      if (allocation.payment_id === payment.id) {
        allocatedCents += toCents(allocation.amount);
      }
    }

    const unallocatedCents =
      payment.payment_type === "rent" ? effectiveCents - allocatedCents : 0;

    return {
      ...payment,
      effective_amount: fromCents(effectiveCents),
      allocated_amount: fromCents(allocatedCents),
      unallocated_amount: fromCents(unallocatedCents),
    };
  });
}

export function calculateDepositBalances(
  deposits: DepositRecord[],
  transactions: DepositTransactionRecord[],
): DepositWithBalance[] {
  return deposits.map((deposit) => {
    let heldCents = 0;
    for (const transaction of transactions) {
      if (transaction.deposit_id === deposit.id) {
        heldCents += toCents(transaction.amount);
      }
    }
    const requiredCents = toCents(deposit.required_amount);

    return {
      ...deposit,
      held_amount: fromCents(heldCents),
      outstanding_amount: fromCents(requiredCents - heldCents),
    };
  });
}

export async function getFinanceLedger(
  supabase: FinanceClient,
  filters: FinanceFilters = {},
): Promise<FinanceLedger> {
  const [charges, payments, allocations, adjustments, reversals, deposits, transactions, receipts] =
    await Promise.all([
      getCharges(supabase, filters),
      getPayments(supabase, filters),
      getAllocations(supabase),
      getAdjustments(supabase),
      getReversals(supabase),
      getDeposits(supabase, filters),
      getDepositTransactions(supabase),
      getReceipts(supabase, filters),
    ]);

  const scopedChargeIds = new Set(charges.map((charge) => charge.id));
  const scopedPaymentIds = new Set(payments.map((payment) => payment.id));
  const scopedDepositIds = new Set(deposits.map((deposit) => deposit.id));

  const scopedAllocations = allocations.filter(
    (row) => scopedPaymentIds.has(row.payment_id) || scopedChargeIds.has(row.charge_id),
  );
  const scopedAdjustments = adjustments.filter(
    (row) =>
      scopedChargeIds.has(row.charge_id) ||
      (row.payment_id !== null && scopedPaymentIds.has(row.payment_id)),
  );
  const scopedReversals = reversals.filter((row) => scopedPaymentIds.has(row.payment_id));
  const scopedTransactions = transactions
    .filter((row) => scopedDepositIds.has(row.deposit_id))
    .filter((row) => inPeriod(row.transaction_date, filters.period));

  return {
    charges: calculateChargeBalances(charges, scopedAllocations, scopedAdjustments),
    payments: calculatePaymentCredits(payments, scopedAllocations, scopedReversals),
    allocations: scopedAllocations,
    adjustments: scopedAdjustments,
    reversals: scopedReversals,
    deposits: calculateDepositBalances(deposits, transactions),
    depositTransactions: scopedTransactions,
    receipts,
  };
}

export function summarizeLedger(ledger: FinanceLedger): FinanceSummary {
  let totalBilledCents = 0;
  let outstandingCents = 0;
  let partiallyPaidCharges = 0;

  for (const charge of ledger.charges) {
    totalBilledCents += toCents(charge.effective_amount);
    if (charge.balance > 0) {
      outstandingCents += toCents(charge.balance);
    }
    if (charge.payment_state === "partial") {
      partiallyPaidCharges += 1;
    }
  }

  let totalCollectedCents = 0;
  let unallocatedCents = 0;
  for (const payment of ledger.payments) {
    if (payment.payment_type !== "rent") continue;
    totalCollectedCents += toCents(payment.effective_amount);
    if (payment.unallocated_amount > 0) {
      unallocatedCents += toCents(payment.unallocated_amount);
    }
  }

  let depositsHeldCents = 0;
  let depositsOutstandingCents = 0;
  for (const deposit of ledger.deposits) {
    if (deposit.held_amount > 0) {
      depositsHeldCents += toCents(deposit.held_amount);
    }
    if (deposit.outstanding_amount > 0) {
      depositsOutstandingCents += toCents(deposit.outstanding_amount);
    }
  }

  return {
    totalBilled: fromCents(totalBilledCents),
    totalCollected: fromCents(totalCollectedCents),
    outstandingRent: fromCents(outstandingCents),
    partiallyPaidCharges,
    unallocatedPayments: fromCents(unallocatedCents),
    depositsHeld: fromCents(depositsHeldCents),
    depositsOutstanding: fromCents(depositsOutstandingCents),
  };
}

export async function getFinanceDashboard(
  supabase: FinanceClient,
  filters: FinanceFilters = {},
): Promise<{ summary: FinanceSummary; ledger: FinanceLedger }> {
  const ledger = await getFinanceLedger(supabase, filters);
  return { summary: summarizeLedger(ledger), ledger };
}

export async function getTenantStatement(
  supabase: FinanceClient,
  tenantId: string,
  period?: string,
): Promise<FinanceLedger> {
  return getFinanceLedger(supabase, { tenantId, period });
}

export async function getLeaseStatement(
  supabase: FinanceClient,
  leaseId: string,
  period?: string,
): Promise<FinanceLedger> {
  return getFinanceLedger(supabase, { leaseId, period });
}

const leaseOptionSchema = z.array(embeddedLeaseSchema);

export async function getLeaseOptions(
  supabase: FinanceClient,
): Promise<EmbeddedLease[]> {
  const { data, error } = await supabase
    .from("leases")
    .select(LEASE_EMBED)
    .order("start_date", { ascending: false });

  if (error) {
    fail("Unable to load lease options.");
  }
  return leaseOptionSchema
    .parse(data ?? [])
    .map((row) => normalizeLease(row))
    .filter((lease): lease is EmbeddedLease => lease !== null);
}

const propertyOptionSchema = z.array(z.object({ id: z.uuid(), title: z.string() }));
const unitOptionSchema = z.array(
  z.object({
    id: z.uuid(),
    unit_number: z.string(),
    property_id: z.uuid(),
    properties: z.union([
      z.object({ id: z.uuid(), title: z.string() }),
      z.array(z.object({ id: z.uuid(), title: z.string() })),
    ]).nullish(),
  }),
);
const tenantOptionSchema = z.array(
  z.object({
    id: z.uuid(),
    full_name: z.string(),
    phone: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
  }),
);

export type FinanceFilterOptions = {
  properties: { id: string; title: string }[];
  units: { id: string; unit_number: string; property_id: string; property_title: string }[];
  tenants: { id: string; full_name: string; phone: string | null; status: string | null }[];
};

export async function getFinanceFilterOptions(
  supabase: FinanceClient,
): Promise<FinanceFilterOptions> {
  const [properties, units, tenants] = await Promise.all([
    supabase.from("properties").select("id, title").order("title", { ascending: true }),
    supabase
      .from("units")
      .select("id, unit_number, property_id, properties(id, title)")
      .order("unit_number", { ascending: true }),
    supabase
      .from("tenants")
      .select("id, full_name, phone, status")
      .order("full_name", { ascending: true }),
  ]);

  if (properties.error) fail("Unable to load property filters.");
  if (units.error) fail("Unable to load unit filters.");
  if (tenants.error) fail("Unable to load tenant filters.");

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
      status: tenant.status ?? null,
    })),
  };
}

export async function getCharge(
  supabase: FinanceClient,
  chargeId: string,
): Promise<ChargeRecord | null> {
  const { data, error } = await supabase
    .from("rent_charges")
    .select(CHARGE_COLUMNS)
    .eq("id", chargeId)
    .maybeSingle();

  if (error) {
    fail("Unable to load the rent charge.");
  }
  if (!data) {
    return null;
  }
  const row = chargeRowSchema.parse(data);
  return { ...row, leases: normalizeLease(row.leases) };
}

export async function getPayment(
  supabase: FinanceClient,
  paymentId: string,
): Promise<PaymentRecord | null> {
  const { data, error } = await supabase
    .from("payments")
    .select(PAYMENT_COLUMNS)
    .eq("id", paymentId)
    .maybeSingle();

  if (error) {
    fail("Unable to load the payment.");
  }
  if (!data) {
    return null;
  }
  const row = paymentRowSchema.parse(data);
  return {
    ...row,
    payment_methods: firstEmbedded(row.payment_methods),
    tenants: firstEmbedded(row.tenants),
    leases: normalizeLease(row.leases),
    receipts: firstEmbedded(row.receipts),
  };
}

export async function getDeposit(
  supabase: FinanceClient,
  depositId: string,
): Promise<DepositRecord | null> {
  const { data, error } = await supabase
    .from("deposits")
    .select(DEPOSIT_COLUMNS)
    .eq("id", depositId)
    .maybeSingle();

  if (error) {
    fail("Unable to load the deposit.");
  }
  if (!data) {
    return null;
  }
  const row = depositRowSchema.parse(data);
  return { ...row, leases: normalizeLease(row.leases) };
}
