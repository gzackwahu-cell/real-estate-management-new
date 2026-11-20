import { ATTACHMENT_BUCKETS, ATTACHMENT_ENTITY_TYPES } from "./constants";

const AGENCY_SCOPE = "danwell";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type AttachmentEntityType = (typeof ATTACHMENT_ENTITY_TYPES)[number];
export type AttachmentVisibility = "private" | "public";

export function isAttachmentEntityType(
  value: string,
): value is AttachmentEntityType {
  return (ATTACHMENT_ENTITY_TYPES as readonly string[]).includes(value);
}

/** Maps a visibility choice to the approved Supabase Storage bucket. */
export function bucketForVisibility(
  visibility: AttachmentVisibility,
): (typeof ATTACHMENT_BUCKETS)[keyof typeof ATTACHMENT_BUCKETS] {
  return visibility === "public"
    ? ATTACHMENT_BUCKETS.publicMarketing
    : ATTACHMENT_BUCKETS.privateDocuments;
}

/**
 * Builds the approved storage path: agency/entity_type/entity_id/file.
 * The caller must supply a server-generated file name; browser file names and
 * paths are never accepted by attachment mutations.
 */
export function buildAttachmentPath(
  entityType: AttachmentEntityType,
  entityId: string,
  fileName: string,
): string {
  if (!isAttachmentEntityType(entityType)) {
    throw new Error("Invalid attachment entity type.");
  }
  if (!UUID_PATTERN.test(entityId)) {
    throw new Error("Invalid attachment entity identifier.");
  }

  const safeFileName = fileName
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160);

  if (!safeFileName || safeFileName.includes("..")) {
    throw new Error("Invalid attachment file name.");
  }

  return `${AGENCY_SCOPE}/${entityType}/${entityId}/${safeFileName}`;
}
