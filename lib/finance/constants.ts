export { formatDate, formatMoney, firstParam } from "@/lib/tenancy/constants";

export const PAYMENT_TYPES = [
  { value: "rent", label: "Rent" },
  { value: "deposit", label: "Deposit" },
] as const;

export const DEPOSIT_TRANSACTION_TYPES = [
  { value: "refund", label: "Refund" },
  { value: "deduction", label: "Deduction" },
  { value: "adjustment", label: "Adjustment" },
] as const;

export const DEPOSIT_DIRECTIONS = [
  { value: "decrease", label: "Decrease held deposit" },
  { value: "increase", label: "Increase held deposit" },
] as const;

export const ADJUSTMENT_TYPES = [
  { value: "charge_adjustment", label: "Charge adjustment" },
  { value: "manual_allocation", label: "Manual allocation" },
  { value: "reallocation", label: "Reallocation" },
  { value: "reversal", label: "Reversal" },
] as const;

export function labelFor<T extends { value: string; label: string }>(
  options: readonly T[],
  value: string,
): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

export function currentPeriod(): string {
  return new Date().toISOString().slice(0, 7);
}

export function isPeriod(value: string): boolean {
  if (!/^\d{4}-\d{2}$/.test(value)) {
    return false;
  }
  const month = Number(value.slice(5));
  return month >= 1 && month <= 12;
}

export function periodToDate(value: string): string | null {
  return isPeriod(value) ? `${value}-01` : null;
}

export function formatPeriod(value: string | null | undefined): string {
  if (!value) {
    return "All periods";
  }
  const month = value.length === 7 ? `${value}-01` : value;
  const date = new Date(`${month}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("en-KE", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("en-KE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(date);
}

export function chargeStatusTone(
  paidCents: number,
  effectiveCents: number,
): "positive" | "warning" | "muted" {
  if (paidCents >= effectiveCents && effectiveCents > 0) return "positive";
  if (paidCents > 0) return "warning";
  if (effectiveCents <= 0) return "muted";
  return "warning";
}
