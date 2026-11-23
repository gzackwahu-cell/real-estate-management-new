import "server-only";

import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createPublicListingClient } from "@/lib/listings/supabase";
import { KENYA_COUNTIES } from "./counties";

const countyRowSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  is_active: z.boolean().optional(),
});

const areaRowSchema = z.object({
  id: z.uuid(),
  county_id: z.uuid(),
  name: z.string(),
  is_active: z.boolean(),
});

export type LocationAreaOption = {
  id: string;
  name: string;
  isActive: boolean;
};

export type LocationCountyOption = {
  id: string;
  name: string;
  areas: LocationAreaOption[];
};

function fallbackCounties(): LocationCountyOption[] {
  return KENYA_COUNTIES.map((name) => ({
    id: `fallback:${name}`,
    name,
    areas: [],
  }));
}

export async function getPublicLocationOptions(): Promise<LocationCountyOption[]> {
  try {
    const client = createPublicListingClient();
    const [countiesResult, areasResult] = await Promise.all([
      client
        .from("counties")
        .select("id, name, is_active")
        .eq("is_active", true)
        .order("name"),
      client
        .from("areas")
        .select("id, county_id, name, is_active")
        .eq("is_active", true)
        .order("name"),
    ]);

    if (countiesResult.error || !countiesResult.data) {
      return fallbackCounties();
    }

    const counties = z.array(countyRowSchema).parse(countiesResult.data);
    const areas =
      !areasResult.error && areasResult.data
        ? z.array(areaRowSchema).parse(areasResult.data)
        : [];

    const byCounty = new Map<string, LocationAreaOption[]>();
    for (const area of areas) {
      const list = byCounty.get(area.county_id) ?? [];
      list.push({ id: area.id, name: area.name, isActive: area.is_active });
      byCounty.set(area.county_id, list);
    }

    const options = counties.map((county) => ({
      id: county.id,
      name: county.name,
      areas: byCounty.get(county.id) ?? [],
    }));

    return options.length > 0 ? options : fallbackCounties();
  } catch {
    return fallbackCounties();
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- accepts both anon and authorized Supabase clients.
type AnyClient = SupabaseClient<any, "public", any>;

export async function getAdminLocationOptions(
  client?: AnyClient,
): Promise<LocationCountyOption[]> {
  try {
    const db = client ?? createPublicListingClient();
    const [countiesResult, areasResult] = await Promise.all([
      db.from("counties").select("id, name, is_active").order("name"),
      db.from("areas").select("id, county_id, name, is_active").order("name"),
    ]);

    if (countiesResult.error || !countiesResult.data) {
      return fallbackCounties();
    }

    const counties = z.array(countyRowSchema).parse(countiesResult.data);
    const areas =
      !areasResult.error && areasResult.data
        ? z.array(areaRowSchema).parse(areasResult.data)
        : [];

    const byCounty = new Map<string, LocationAreaOption[]>();
    for (const area of areas) {
      const list = byCounty.get(area.county_id) ?? [];
      list.push({ id: area.id, name: area.name, isActive: area.is_active });
      byCounty.set(area.county_id, list);
    }

    const options = counties.map((county) => ({
      id: county.id,
      name: county.name,
      areas: byCounty.get(county.id) ?? [],
    }));

    return options.length > 0 ? options : fallbackCounties();
  } catch {
    return fallbackCounties();
  }
}
