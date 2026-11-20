import "server-only";

import { z } from "zod";
import { ATTACHMENT_BUCKETS } from "./constants";
import { ATTACHMENT_COLUMNS, type PortfolioClient } from "./queries";
import {
  attachmentRowSchema,
  type AttachmentRecord,
} from "./validation";

const SIGNED_URL_TTL_SECONDS = 60 * 60;

const VALID_BUCKETS = new Set<string>(Object.values(ATTACHMENT_BUCKETS));

export type AttachmentView = AttachmentRecord & {
  url: string | null;
};

/** Loads attachment rows that the caller's RLS scope is allowed to see. */
export async function loadAttachments(
  supabase: PortfolioClient,
  entityType: string,
  entityId: string,
): Promise<AttachmentRecord[]> {
  const { data, error } = await supabase
    .from("attachments")
    .select(ATTACHMENT_COLUMNS)
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("is_primary", { ascending: false })
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error("Unable to load attachments.");
  }

  return z.array(attachmentRowSchema).parse(data ?? []);
}

/**
 * Creates short-lived view URLs with the caller's authorized client. Rows are
 * already RLS-scoped by loadAttachments(); no private path is ever rendered on
 * a public page.
 */
export async function getAttachmentViews(
  supabase: PortfolioClient,
  attachments: AttachmentRecord[],
): Promise<AttachmentView[]> {
  return Promise.all(
    attachments.map(async (attachment) => {
      if (!VALID_BUCKETS.has(attachment.bucket)) {
        return { ...attachment, url: null };
      }

      const { data, error } = await supabase.storage
        .from(attachment.bucket)
        .createSignedUrl(attachment.path, SIGNED_URL_TTL_SECONDS, {
          download: false,
        });

      return {
        ...attachment,
        url: error || !data ? null : data.signedUrl,
      };
    }),
  );
}

export async function loadAttachmentViews(
  supabase: PortfolioClient,
  entityType: string,
  entityId: string,
): Promise<AttachmentView[]> {
  return getAttachmentViews(
    supabase,
    await loadAttachments(supabase, entityType, entityId),
  );
}
