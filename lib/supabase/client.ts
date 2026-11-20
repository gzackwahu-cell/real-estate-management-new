"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublicEnv } from "./env";

let browserClient: SupabaseClient | undefined;

/**
 * Returns a single Supabase client for browser-side code.
 *
 * The client uses cookies through @supabase/ssr so the server can read the
 * same session. This is safe for the browser because access is controlled by
 * database Row Level Security, not by hiding the public key.
 */
export function getSupabaseBrowserClient(): SupabaseClient {
  if (browserClient) {
    return browserClient;
  }

  const { url, anonKey } = getSupabasePublicEnv();
  browserClient = createBrowserClient(url, anonKey);
  return browserClient;
}
