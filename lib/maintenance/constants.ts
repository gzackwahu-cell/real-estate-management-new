export { formatDate, formatMoney, firstParam } from "@/lib/tenancy/constants";

import type { StatusTone } from "@/lib/tenancy/constants";

export const MAINTENANCE_CATEGORIES = [
  { value: "plumbing", label: "Plumbing" },
  { value: "electrical", label: "Electrical" },
  { value: "structural", label: "Structural" },
  { value: "cleaning", label: "Cleaning" },
  { value: "security", label: "Security" },
  { value: "appliances", label: "Appliances" },
  { value: "painting", label: "Painting" },
  { value: "other", label: "Other" },
] as const;

export const MAINTENANCE_PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "emergency", label: "Emergency" },
] as const;

export const MAINTENANCE_STATUSES = [
  { value: "submitted", label: "Submitted" },
  { value: "acknowledged", label: "Acknowledged" },
  { value: "assigned", label: "Assigned" },
  { value: "in_progress", label: "In progress" },
  { value: "awaiting_parts", label: "Awaiting parts" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
] as const;

export const EXPENSE_CATEGORIES = [
  { value: "materials", label: "Materials" },
  { value: "labour", label: "Labour" },
  { value: "other", label: "Other" },
] as const;

export const EXPENSE_PAYMENT_STATUSES = [
  { value: "unpaid", label: "Unpaid" },
  { value: "partial", label: "Partially paid" },
  { value: "paid", label: "Paid" },
] as const;

export const NOTIFICATION_EVENT_LABELS: Record<string, string> = {
  maintenance_new: "New request",
  maintenance_assigned: "Assignment",
  maintenance_status: "Status update",
  maintenance_completed: "Completed",
};

export function labelFor<T extends { value: string; label: string }>(
  options: readonly T[],
  value: string,
): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

export function maintenanceStatusTone(status: string): StatusTone {
  if (status === "completed") return "positive";
  if (status === "cancelled") return "muted";
  if (status === "emergency" || status === "awaiting_parts") return "warning";
  if (status === "submitted" || status === "acknowledged") return "warning";
  return "neutral";
}

export function maintenancePriorityTone(priority: string): StatusTone {
  if (priority === "emergency") return "warning";
  if (priority === "high") return "warning";
  if (priority === "low") return "muted";
  return "neutral";
}

export function isOpenMaintenanceStatus(status: string): boolean {
  return status !== "completed" && status !== "cancelled";
}

export function currentDate(): string {
  return new Date().toISOString().slice(0, 10);
}
