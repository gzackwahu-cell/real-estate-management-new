import "server-only";

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublicEnv } from "./env";

export type SupabaseProxyResult = {
  /** True when the request has a verified, non-expired session and an active profile. */
  isAuthenticated: boolean;
  /** The response that carries refreshed/cleared cookies and no-cache headers. */
  response: NextResponse;
};

const noStoreHeaders: Record<string, string> = {
  "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0",
  Expires: "0",
  Pragma: "no-cache",
};

type CookieToSet = {
  name: string;
  value: string;
  options: CookieOptions;
};

function isSupabaseAuthCookie(name: string): boolean {
  return name.includes("-auth-token");
}

/**
 * Refreshes the Supabase session once per request and returns a response that
 * carries the updated cookies. getClaims() verifies the token signature; the
 * cookie contents alone are never trusted for authorization. An inactive or
 * missing profile is treated exactly like no session and clears the local
 * session cookies without revoking other devices.
 */
export async function refreshSupabaseSession(
  request: NextRequest,
): Promise<SupabaseProxyResult> {
  const { url, anonKey } = getSupabasePublicEnv();
  let response: NextResponse = NextResponse.next({ request });

  const applyCookies = (
    cookiesToSet: CookieToSet[],
    headers: Record<string, string>,
  ) => {
    cookiesToSet.forEach(({ name, value, options }) => {
      if (options?.maxAge === 0) {
        request.cookies.delete(name);
      } else {
        request.cookies.set(name, value);
      }
    });

    // Rebuild the response so downstream code and redirects receive the new
    // cookie state, including Max-Age=0 deletion cookies.
    response = NextResponse.next({ request });

    cookiesToSet.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options);
    });

    Object.entries({ ...noStoreHeaders, ...headers }).forEach(
      ([key, value]) => {
        response.headers.set(key, value);
      },
    );
  };

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll: applyCookies,
    },
  });

  const { data, error: claimsError } = await supabase.auth.getClaims();
  const hasSession = !claimsError && Boolean(data?.claims?.sub);

  let profileIsActive = false;
  if (hasSession) {
    const { data: activeData, error: activeError } = await supabase.rpc(
      "is_profile_active",
    );
    profileIsActive = !activeError && activeData === true;
  }

  const isAuthenticated = hasSession && profileIsActive;

  if (!isAuthenticated) {
    const clearFallbackCookies = () => {
      applyCookies(
        request.cookies
          .getAll()
          .filter(({ name }) => isSupabaseAuthCookie(name))
          .map(({ name }) => ({
            name,
            value: "",
            options: { path: "/", maxAge: 0 },
          })),
        {},
      );
    };

    try {
      const { error: signOutError } = await supabase.auth.signOut({
        scope: "local",
      });
      if (signOutError) {
        clearFallbackCookies();
      }
    } catch {
      // signOut can reject if no session is present; still clear stale cookies.
      clearFallbackCookies();
    }
  }

  // Always prevent CDN/proxy caching for auth-related routes, even when the
  // token did not need refreshing on this request.
  Object.entries(noStoreHeaders).forEach(([key, value]) => {
    if (!response.headers.has(key)) {
      response.headers.set(key, value);
    }
  });

  return {
    isAuthenticated,
    response,
  };
}

/**
 * Redirects while preserving refreshed/cleared auth cookies and no-cache
 * headers. Deletion cookies are copied with their options so the stale session
 * is also removed in the browser.
 */
export function redirectWithSession(
  source: NextResponse,
  request: NextRequest,
  pathname: string,
): NextResponse {
  const redirect = NextResponse.redirect(new URL(pathname, request.url));
  source.cookies.getAll().forEach((cookie) => {
    redirect.cookies.set(cookie.name, cookie.value, cookie);
  });

  ["cache-control", "expires", "pragma"].forEach((header) => {
    const value = source.headers.get(header);
    if (value) {
      redirect.headers.set(header, value);
    }
  });

  return redirect;
}
