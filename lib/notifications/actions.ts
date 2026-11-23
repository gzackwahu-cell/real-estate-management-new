"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { withPermission } from "@/lib/auth/guards";
import type { NotificationActionState } from "./queries";

const uuidSchema = z.uuid();

function failure(error: string): NotificationActionState {
  return { ok: false, error };
}

function refreshNotificationViews(): void {
  revalidatePath("/dashboard/notifications");
  revalidatePath("/dashboard");
}

/**
 * RLS limits the SELECT path to the recipient. We still scope the UPDATE by
 * recipient and status so a stale client cannot act on someone else's row.
 * The matching UPDATE policy/grant is added by migration 0025.
 */
export async function markNotificationReadAction(
  notificationId: string,
): Promise<NotificationActionState> {
  const parsedId = uuidSchema.safeParse(notificationId);
  if (!parsedId.success) {
    return failure("Invalid notification.");
  }

  return withPermission("notifications", "edit", async (context, supabase) => {
    const { data, error } = await supabase
      .from("notifications")
      .update({ status: "read", read_at: new Date().toISOString() })
      .eq("id", parsedId.data)
      .eq("recipient_profile_id", context.userId)
      .eq("status", "unread")
      .select("id");

    if (error) {
      return failure("Unable to mark this notification as read. Please try again.");
    }
    if (!data || data.length === 0) {
      return { ok: true, message: "Notification was already read." };
    }

    refreshNotificationViews();
    return { ok: true, message: "Marked as read." };
  });
}

export async function markAllNotificationsReadAction(): Promise<NotificationActionState> {
  return withPermission("notifications", "edit", async (context, supabase) => {
    const { data, error } = await supabase
      .from("notifications")
      .update({ status: "read", read_at: new Date().toISOString() })
      .eq("recipient_profile_id", context.userId)
      .eq("status", "unread")
      .select("id");

    if (error) {
      return failure("Unable to mark notifications as read. Please try again.");
    }
    if (!data || data.length === 0) {
      return { ok: true, message: "No unread notifications." };
    }

    refreshNotificationViews();
    return { ok: true, message: `Marked ${data.length} notification(s) as read.` };
  });
}
