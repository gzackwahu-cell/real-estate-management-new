import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { AuthorizedContext } from "@/lib/auth/dal";
import { getSupabasePublicEnv } from "./env";

/**
 * INTERNAL: creates a request-specific Supabase client for Server Components,
 * Server Actions and Route Handlers. Only files under lib/auth should import
 * this directly; sensitive code must use getAuthorizedServerClient() instead.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = getSupabasePublicEnv();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot write cookies. proxy.ts refreshes them
          // before the request reaches the page.
        }
      },
    },
  });
}

/**
 * Returns a Supabase client only when the caller already holds an authorized
 * context from the DAL. The branded context cannot be created by ordinary
 * application code, so sensitive actions cannot reach a client without passing
 * through an authorization check first.
 */
export async function getAuthorizedServerClient(
  context: AuthorizedContext,
) {
  // The brand is the authorization proof; it is not otherwise needed at runtime.
  void context;
  return createSupabaseServerClient();
}
