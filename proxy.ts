import type { NextRequest } from "next/server";
import {
  redirectWithSession,
  refreshSupabaseSession,
} from "@/lib/supabase/proxy";

const protectedPrefixes = ["/dashboard", "/tenant", "/owner"];
const authRoutes = ["/login"];

function isProtectedRoute(pathname: string): boolean {
  return protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Next.js 16 Proxy performs a fast, optimistic route check and refreshes the
 * Supabase session. Real authorization also happens in the server DAL because
 * Proxy must not be the only line of defense.
 */
export async function proxy(request: NextRequest) {
  const { isAuthenticated, response } = await refreshSupabaseSession(request);
  const pathname = request.nextUrl.pathname;

  if (isProtectedRoute(pathname) && !isAuthenticated) {
    return redirectWithSession(response, request, "/login");
  }

  if (authRoutes.includes(pathname) && isAuthenticated) {
    return redirectWithSession(response, request, "/dashboard");
  }

  return response;
}

export const config = {
  matcher: [
    "/login",
    "/dashboard",
    "/dashboard/:path*",
    "/tenant",
    "/tenant/:path*",
    "/owner",
    "/owner/:path*",
  ],
};
