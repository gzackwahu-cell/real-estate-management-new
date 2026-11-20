import "server-only";

import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { getAuthorizedServerClient } from "@/lib/supabase/server";
import {
  hasPermission,
  requireRoles,
  requireUser,
  requireUserOrNull,
  type AuthorizedContext,
} from "./dal";
import type { ActionName, ModuleName, RoleName } from "./roles";

type AuthorizedClient = Awaited<ReturnType<typeof getAuthorizedServerClient>>;

type AuthorizedHandler<T> = (
  context: AuthorizedContext,
  supabase: AuthorizedClient,
) => Promise<T>;

/**
 * Use at the top of every sensitive Server Action. The handler only receives a
 * Supabase client after the session and exact permission have been verified.
 */
export async function withPermission<T>(
  module: ModuleName,
  action: ActionName,
  handler: AuthorizedHandler<T>,
): Promise<T> {
  const context = await requireUser();

  if (!(await hasPermission(module, action))) {
    redirect("/dashboard");
  }

  const supabase = await getAuthorizedServerClient(context);
  return handler(context, supabase);
}

/** Use for Server Actions that need only a coarse role check. */
export async function withRoles<T>(
  roles: readonly RoleName[],
  handler: AuthorizedHandler<T>,
): Promise<T> {
  const context = await requireRoles(...roles);
  const supabase = await getAuthorizedServerClient(context);
  return handler(context, supabase);
}

/**
 * Use at the top of every sensitive Route Handler. Returns JSON 401/403 instead
 * of redirecting, and never calls the handler when authorization fails.
 */
export async function withApiPermission(
  module: ModuleName,
  action: ActionName,
  handler: AuthorizedHandler<Response>,
): Promise<Response> {
  const context = await requireUserOrNull();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await hasPermission(module, action))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await getAuthorizedServerClient(context);
  return handler(context, supabase);
}
