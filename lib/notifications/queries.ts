import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

/** Values accepted by notifications_event_type_check in migration 0018. */
export const NOTIFICATION_EVENT_TYPES = [
  "maintenance_new",
  "maintenance_assigned",
  "maintenance_status",
  "maintenance_completed",
] as const;

export type NotificationEventType = (typeof NOTIFICATION_EVENT_TYPES)[number];

export const NOTIFICATION_EVENT_LABELS: Record<NotificationEventType, string> = {
  maintenance_new: "New request",
  maintenance_assigned: "Request assigned",
  maintenance_status: "Status update",
  maintenance_completed: "Request completed",
};

export type NotificationFilter = "all" | "unread" | "read";

export type NotificationActionState = {
  ok?: boolean;
  error?: string;
  message?: string;
};

const notificationRowSchema = z.object({
  id: z.uuid(),
  recipient_profile_id: z.uuid(),
  event_type: z.enum(NOTIFICATION_EVENT_TYPES),
  title: z.string(),
  message: z.string(),
  channel: z.literal("in_app"),
  status: z.enum(["unread", "read"]),
  entity_type: z.string().nullable().optional(),
  entity_id: z.uuid().nullable().optional(),
  link: z.string().nullable().optional(),
  created_at: z.string(),
  read_at: z.string().nullable().optional(),
});

export type NotificationRecord = z.infer<typeof notificationRowSchema>;

const NOTIFICATION_COLUMNS =
  "id, recipient_profile_id, event_type, title, message, channel, status, entity_type, entity_id, link, created_at, read_at";

export function notificationEventLabel(eventType: string): string {
  return (
    NOTIFICATION_EVENT_LABELS[eventType as NotificationEventType] ?? eventType
  );
}

/** Only render internal dashboard paths stored by our own notification helpers. */
export function safeInternalLink(link: string | null | undefined): string | null {
  if (!link || !link.startsWith("/") || link.startsWith("//")) {
    return null;
  }
  return link;
}

export async function getNotifications(
  supabase: SupabaseClient,
  recipientProfileId: string,
  filter: NotificationFilter = "all",
  limit = 100,
): Promise<NotificationRecord[]> {
  let query = supabase
    .from("notifications")
    .select(NOTIFICATION_COLUMNS)
    .eq("recipient_profile_id", recipientProfileId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (filter !== "all") {
    query = query.eq("status", filter);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error("Unable to load notifications.");
  }

  return z.array(notificationRowSchema).parse(data ?? []);
}

export async function getUnreadNotificationCount(
  supabase: SupabaseClient,
  recipientProfileId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_profile_id", recipientProfileId)
    .eq("status", "unread");

  if (error) {
    throw new Error("Unable to count unread notifications.");
  }

  return count ?? 0;
}
