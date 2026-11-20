export const TENANT_STATUSES = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "blacklisted", label: "Blacklisted" },
  { value: "archived", label: "Archived" },
] as const;

export const APPLICATION_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "under_review", label: "Under review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "withdrawn", label: "Withdrawn" },
] as const;

export const LEASE_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "pending", label: "Pending" },
  { value: "active", label: "Active" },
  { value: "expired", label: "Expired" },
  { value: "terminated", label: "Terminated" },
] as const;

export const REVIEWABLE_APPLICATION_STATUSES = [
  { value: "under_review", label: "Under review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "withdrawn", label: "Withdrawn" },
] as const;

export type StatusTone = "neutral" | "positive" | "warning" | "muted";

export function tenantStatusTone(status: string): StatusTone {
  if (status === "active") return "positive";
  if (status === "blacklisted") return "warning";
  if (status === "archived") return "muted";
  return "neutral";
}

export function applicationStatusTone(status: string): StatusTone {
  if (status === "approved") return "positive";
  if (status === "rejected" || status === "withdrawn") return "muted";
  if (status === "under_review") return "neutral";
  return "warning";
}

export function leaseStatusTone(status: string): StatusTone {
  if (status === "active") return "positive";
  if (status === "pending") return "warning";
  if (status === "expired" || status === "terminated") return "muted";
  return "neutral";
}

export function isOpenApplicationStatus(status: string): boolean {
  return status === "pending" || status === "under_review";
}

export function isCurrentLeaseStatus(status: string): boolean {
  return status === "active" || status === "pending";
}

export function isPreviousLeaseStatus(status: string): boolean {
  return status === "expired" || status === "terminated";
}

export function formatMoney(value: number | string): string {
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount)) {
    return `KES ${value}`;
  }

  return `KES ${new Intl.NumberFormat("en-KE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)}`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-KE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function addOneDay(value: string): string {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

export function firstParam(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function statusFilter(
  value: string | string[] | undefined,
  options: readonly { value: string }[],
): string | undefined {
  const candidate = firstParam(value);
  return options.some((option) => option.value === candidate)
    ? candidate
    : undefined;
}
