import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

const roleNamesSchema = z.array(z.object({ name: z.string().min(1) }));

/**
 * Reads the active role names for the signed-in profile. The database function
 * checks profile.is_active, assignment.is_active and role.is_active, so this
 * lookup cannot return roles for a disabled account.
 */
export async function getRoleNames(
  supabase: SupabaseClient,
): Promise<string[]> {
  const { data, error } = await supabase.rpc("get_my_active_role_names");

  if (error) {
    return [];
  }

  const parsed = roleNamesSchema.safeParse(data);
  if (!parsed.success) {
    return [];
  }

  return Array.from(new Set(parsed.data.map(({ name }) => name)));
}
