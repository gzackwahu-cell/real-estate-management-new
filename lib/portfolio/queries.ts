import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  attachmentRowSchema,
  ownerRowSchema,
  propertyOwnerRowSchema,
  propertyRowSchema,
  unitRowSchema,
  type AttachmentRecord,
  type OwnerOption,
  type OwnerPropertyRecord,
  type OwnerRecord,
  type PropertyOwnerRecord,
  type PropertyRecord,
  type UnitRecord,
} from "./validation";

export type PortfolioClient = SupabaseClient;

export type PropertyListItem = PropertyRecord & {
  owners: PropertyOwnerRecord[];
};

export type PropertyDetail = {
  property: PropertyRecord;
  owners: PropertyOwnerRecord[];
  units: UnitRecord[];
  attachments: AttachmentRecord[];
};

export type OwnerDetail = {
  owner: OwnerRecord;
  properties: OwnerPropertyRecord[];
};

const ownerOptionSchema = z.object({
  id: z.uuid(),
  full_name: z.string(),
  id_reference: z.string(),
  is_active: z.boolean(),
});

const ownerPropertyRowListSchema = z.array(
  z.object({
    property_id: z.uuid(),
    owner_id: z.uuid(),
    ownership_percentage: z.preprocess(
      (value) =>
        value === null || value === undefined || value === ""
          ? null
          : Number(value),
      z.number().refine(Number.isFinite, "Invalid stored number.").nullable(),
    ),
    verification_status: z.string(),
    is_primary: z.boolean(),
    properties: z
      .union([
        z.object({
          id: z.uuid(),
          title: z.string(),
          property_type: z.string(),
          county: z.string(),
          town: z.string(),
          status: z.string(),
        }),
        z.array(
          z.object({
            id: z.uuid(),
            title: z.string(),
            property_type: z.string(),
            county: z.string(),
            town: z.string(),
            status: z.string(),
          }),
        ),
      ])
      .nullish(),
  }),
);

const PROPERTY_COLUMNS =
  "id, title, description, property_type, county, town, estate, physical_address, directions, status, created_at";

const OWNER_COLUMNS =
  "id, full_name, phone, email, id_reference, address, is_active, created_at";

const UNIT_COLUMNS =
  "id, property_id, unit_number, unit_type, floor, bedrooms, bathrooms, area_sqm, monthly_rent, deposit_amount, rent_period, deposit_required, occupancy_status, is_active, is_listable, sort_order, amenities, public_notes, notes";

export const ATTACHMENT_COLUMNS =
  "id, entity_type, entity_id, bucket, visibility, path, caption, is_primary, sort_order";

const PROPERTY_OWNER_EMBED =
  "property_id, owner_id, ownership_percentage, verification_status, is_primary, owners(id, full_name, id_reference)";

function firstEmbedded<T>(value: T | T[] | null | undefined): T | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value ?? undefined;
}

function fail(message: string): never {
  throw new Error(message);
}

export async function getOwners(supabase: PortfolioClient): Promise<OwnerRecord[]> {
  const { data, error } = await supabase
    .from("owners")
    .select(OWNER_COLUMNS)
    .order("full_name", { ascending: true });

  if (error) {
    fail("Unable to load owners.");
  }

  return z.array(ownerRowSchema).parse(data ?? []);
}

export async function getOwnerOptions(
  supabase: PortfolioClient,
): Promise<OwnerOption[]> {
  const { data, error } = await supabase
    .from("owners")
    .select("id, full_name, id_reference, is_active")
    .order("full_name", { ascending: true });

  if (error) {
    fail("Unable to load owner options.");
  }

  return z.array(ownerOptionSchema).parse(data ?? []);
}

export async function getOwner(
  supabase: PortfolioClient,
  ownerId: string,
): Promise<OwnerRecord | null> {
  const { data, error } = await supabase
    .from("owners")
    .select(OWNER_COLUMNS)
    .eq("id", ownerId)
    .maybeSingle();

  if (error) {
    fail("Unable to load the owner.");
  }

  return data ? ownerRowSchema.parse(data) : null;
}

export async function getOwnerDetail(
  supabase: PortfolioClient,
  ownerId: string,
): Promise<OwnerDetail | null> {
  const owner = await getOwner(supabase, ownerId);
  if (!owner) {
    return null;
  }

  const { data, error } = await supabase
    .from("property_owners")
    .select(
      "property_id, owner_id, ownership_percentage, verification_status, is_primary, properties(id, title, property_type, county, town, status)",
    )
    .eq("owner_id", ownerId)
    .order("is_primary", { ascending: false });

  if (error) {
    fail("Unable to load the owner's properties.");
  }

  const properties = ownerPropertyRowListSchema.parse(data ?? []).map((row) => ({
    property_id: row.property_id,
    owner_id: row.owner_id,
    ownership_percentage: row.ownership_percentage,
    verification_status: row.verification_status,
    is_primary: row.is_primary,
    properties: firstEmbedded(row.properties) ?? null,
  })) as OwnerPropertyRecord[];

  return { owner, properties };
}

export async function getProperties(
  supabase: PortfolioClient,
): Promise<PropertyListItem[]> {
  const { data, error } = await supabase
    .from("properties")
    .select(PROPERTY_COLUMNS)
    .order("created_at", { ascending: false });

  if (error) {
    fail("Unable to load properties.");
  }

  const properties = z.array(propertyRowSchema).parse(data ?? []);
  if (properties.length === 0) {
    return [];
  }

  const { data: assignments, error: assignmentError } = await supabase
    .from("property_owners")
    .select(PROPERTY_OWNER_EMBED)
    .in(
      "property_id",
      properties.map((property) => property.id),
    );

  if (assignmentError) {
    fail("Unable to load property owners.");
  }

  const parsedAssignments = z
    .array(propertyOwnerRowSchema)
    .parse(assignments ?? [])
    .map((row) => ({
      ...row,
      owners: firstEmbedded(row.owners) ?? null,
    }));

  return properties.map((property) => ({
    ...property,
    owners: parsedAssignments.filter(
      (assignment) => assignment.property_id === property.id,
    ),
  }));
}

export async function getProperty(
  supabase: PortfolioClient,
  propertyId: string,
): Promise<PropertyRecord | null> {
  const { data, error } = await supabase
    .from("properties")
    .select(PROPERTY_COLUMNS)
    .eq("id", propertyId)
    .maybeSingle();

  if (error) {
    fail("Unable to load the property.");
  }

  return data ? propertyRowSchema.parse(data) : null;
}

export async function getPropertyDetail(
  supabase: PortfolioClient,
  propertyId: string,
): Promise<PropertyDetail | null> {
  const property = await getProperty(supabase, propertyId);
  if (!property) {
    return null;
  }

  const [assignmentResult, unitResult, attachmentResult] = await Promise.all([
    supabase
      .from("property_owners")
      .select(PROPERTY_OWNER_EMBED)
      .eq("property_id", propertyId)
      .order("is_primary", { ascending: false }),
    supabase
      .from("units")
      .select(UNIT_COLUMNS)
      .eq("property_id", propertyId)
      .order("sort_order", { ascending: true })
      .order("floor", { ascending: true })
      .order("unit_number", { ascending: true }),
    supabase
      .from("attachments")
      .select(ATTACHMENT_COLUMNS)
      .eq("entity_type", "property")
      .eq("entity_id", propertyId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);

  if (assignmentResult.error) {
    fail("Unable to load property owners.");
  }
  if (unitResult.error) {
    fail("Unable to load units.");
  }
  if (attachmentResult.error) {
    fail("Unable to load attachments.");
  }

  const owners = z
    .array(propertyOwnerRowSchema)
    .parse(assignmentResult.data ?? [])
    .map((row) => ({
      ...row,
      owners: firstEmbedded(row.owners) ?? null,
    }));

  return {
    property,
    owners,
    units: z.array(unitRowSchema).parse(unitResult.data ?? []),
    attachments: z.array(attachmentRowSchema).parse(attachmentResult.data ?? []),
  };
}

export async function getUnit(
  supabase: PortfolioClient,
  propertyId: string,
  unitId: string,
): Promise<UnitRecord | null> {
  const { data, error } = await supabase
    .from("units")
    .select(UNIT_COLUMNS)
    .eq("id", unitId)
    .eq("property_id", propertyId)
    .maybeSingle();

  if (error) {
    fail("Unable to load the unit.");
  }

  return data ? unitRowSchema.parse(data) : null;
}

export type UnitWithProperty = UnitRecord & { property_title: string; property_county: string; property_town: string };

export async function getAllUnits(supabase: PortfolioClient): Promise<UnitWithProperty[]> {
  const { data, error } = await supabase
    .from("units")
    .select(`${UNIT_COLUMNS}, properties(title, county, town)`)
    .order("unit_number", { ascending: true })
    .limit(500);

  if (error) {
    fail("Unable to load units.");
  }

  const rowSchema = unitRowSchema.extend({
    properties: z.union([
      z.object({ title: z.string(), county: z.string(), town: z.string() }),
      z.array(z.object({ title: z.string(), county: z.string(), town: z.string() })),
    ]).nullish(),
  });

  return z.array(rowSchema).parse(data ?? []).map((row) => {
    const p = firstEmbedded(row.properties);
    const { properties: _properties, ...unit } = row;
    void _properties;
    return {
      ...unit,
      property_title: p?.title ?? "Property",
      property_county: p?.county ?? "",
      property_town: p?.town ?? "",
    };
  });
}
