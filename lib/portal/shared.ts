import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getMaintenanceNotifications } from "@/lib/maintenance/queries";
import type { MaintenanceNotification } from "@/lib/maintenance/validation";

/** Notifications are scoped to the authenticated profile by database RLS. */
export async function getPortalNotifications(
  supabase: SupabaseClient,
  limit = 8,
): Promise<MaintenanceNotification[]> {
  try {
    return await getMaintenanceNotifications(supabase, limit);
  } catch {
    return [];
  }
}

export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
