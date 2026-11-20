import "server-only";

import { createClient } from "@supabase/supabase-js";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

/**
 * Anonymous-only client for public website reads and form submissions.
 * It deliberately ignores browser cookies so public pages can never inherit a
 * staff session and accidentally expose private rows.
 */
export function createPublicListingClient() {
  const { url, anonKey } = getSupabasePublicEnv();
  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
