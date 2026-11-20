"use server";

import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { AuthorizedContext } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/auth/dal";
import { withPermission, withRoles } from "@/lib/auth/guards";
import { STAFF_ROLES, type ActionName, type ModuleName } from "@/lib/auth/roles";
import { ATTACHMENT_BUCKETS } from "./constants";
import { ATTACHMENT_COLUMNS } from "./queries";
import { bucketForVisibility, buildAttachmentPath } from "./storage";
import {
  attachmentExtensionForMime,
  attachmentRowSchema,
  attachmentUploadSchema,
  attachmentUploadValues,
  formStateFromZod,
  isAttachmentMimeAllowed,
  isManagedAttachmentEntityType,
  MAX_ATTACHMENT_BYTES,
  type PortfolioFormState,
} from "./validation";

type AuthorizedClient = SupabaseClient;

type MutationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

type MutationHandler<T> = (
  context: AuthorizedContext,
  supabase: AuthorizedClient,
) => Promise<T>;

const VALID_BUCKETS = new Set<string>(Object.values(ATTACHMENT_BUCKETS));

const UPLOAD_ERROR = "The file could not be uploaded. Check it and try again.";
const SAVE_ERROR = "The attachment could not be saved. Check it and try again.";
const DELETE_ERROR = "The attachment could not be deleted. Try again.";

class AttachmentActionError extends Error {}

const allowedMessages = [
  "You are not approved to publish marketing images.",
  "This listing is not approved for publication.",
  "The linked record no longer exists.",
  "Choose a file to upload.",
  "The selected file is empty.",
  "This file type is not allowed for the selected visibility.",
  "The file is larger than the 10 MB limit.",
  UPLOAD_ERROR,
  SAVE_ERROR,
  DELETE_ERROR,
  "You do not have permission to manage this attachment.",
  "This attachment type cannot be managed here.",
  "Unable to load the attachment.",
];

const revalidatePathsSchema = z.array(
  z.string().refine((value) => value.startsWith("/"), {
    message: "Invalid revalidation path.",
  }),
);

function safeAttachmentError(error: unknown, fallback = SAVE_ERROR): string {
  const message = error instanceof Error ? error.message : "";
  if (allowedMessages.includes(message)) {
    return message;
  }
  if (
    message.includes("Attachment path does not match its entity") ||
    message.includes("attachments_path_not_blank")
  ) {
    return "The attachment path is not valid.";
  }
  return fallback;
}

function validId(value: string): boolean {
  return z.uuid().safeParse(value).success;
}

function moduleForEntityType(
  entityType: "property" | "unit" | "listing" | "lease",
): ModuleName {
  switch (entityType) {
    case "property":
      return "properties";
    case "unit":
      return "units";
    case "listing":
      return "listings";
    case "lease":
      return "leases";
  }
}

function revalidate(paths: string[]): void {
  for (const path of paths) {
    revalidatePath(path);
  }
}

async function runPermissionMutation<T>(
  module: ModuleName,
  action: ActionName,
  handler: MutationHandler<T>,
): Promise<MutationResult<T>> {
  let result: MutationResult<T> | undefined;

  // withPermission may redirect. Keep it outside the try/catch so the framework
  // redirect is never converted into a form error.
  await withPermission(module, action, async (context, supabase) => {
    try {
      result = { ok: true, value: await handler(context, supabase) };
    } catch (error) {
      result = { ok: false, error: safeAttachmentError(error) };
    }
  });

  return result ?? { ok: false, error: SAVE_ERROR };
}

async function runStaffMutation<T>(
  handler: MutationHandler<T>,
): Promise<MutationResult<T>> {
  let result: MutationResult<T> | undefined;

  await withRoles(STAFF_ROLES, async (context, supabase) => {
    try {
      result = { ok: true, value: await handler(context, supabase) };
    } catch (error) {
      result = { ok: false, error: safeAttachmentError(error) };
    }
  });

  return result ?? { ok: false, error: SAVE_ERROR };
}

async function assertEntityExists(
  supabase: AuthorizedClient,
  entityType: "property" | "unit" | "listing" | "lease",
  entityId: string,
): Promise<void> {
  const table =
    entityType === "lease"
      ? "leases"
      : entityType === "listing"
        ? "listings"
        : entityType === "unit"
          ? "units"
          : "properties";

  const { data, error } = await supabase
    .from(table)
    .select("id")
    .eq("id", entityId)
    .maybeSingle();

  if (error || !data) {
    throw new AttachmentActionError("The linked record no longer exists.");
  }
}

type ApprovedListing = {
  id: string;
  slug: string;
  property_id: string | null;
};

async function findApprovedListing(
  supabase: AuthorizedClient,
  entityType: "property" | "unit" | "listing" | "lease",
  entityId: string,
): Promise<ApprovedListing | null> {
  if (entityType === "listing") {
    const { data, error } = await supabase
      .from("listings")
      .select("id, slug, property_id, is_published, status")
      .eq("id", entityId)
      .maybeSingle();

    if (error || !data || !data.is_published || data.status !== "active") {
      return null;
    }
    return { id: data.id, slug: data.slug, property_id: data.property_id };
  }

  if (entityType === "property") {
    const { data, error } = await supabase
      .from("listings")
      .select("id, slug, property_id")
      .eq("property_id", entityId)
      .eq("is_published", true)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return null;
    }
    return { id: data.id, slug: data.slug, property_id: data.property_id };
  }

  return null;
}

export async function uploadAttachmentAction(
  entityType: string,
  entityId: string,
  revalidatePaths: string[],
  _previousState: PortfolioFormState,
  formData: FormData,
): Promise<PortfolioFormState> {
  void _previousState;

  if (!isManagedAttachmentEntityType(entityType) || !validId(entityId)) {
    return { error: "Invalid attachment target." };
  }

  let paths: string[];
  try {
    paths = revalidatePathsSchema.parse(revalidatePaths);
  } catch {
    return { error: "Invalid attachment target." };
  }

  const parsed = attachmentUploadSchema.safeParse({
    ...attachmentUploadValues(formData),
    entityType,
    entityId,
  });
  if (!parsed.success) {
    return formStateFromZod(parsed.error);
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { fieldErrors: { file: "Choose a file to upload." } };
  }
  if (file.size === 0) {
    return { fieldErrors: { file: "The selected file is empty." } };
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return { fieldErrors: { file: "The file is larger than the 10 MB limit." } };
  }

  const { visibility } = parsed.data;
  const mimeType = file.type;
  if (!isAttachmentMimeAllowed(mimeType, visibility)) {
    return {
      fieldErrors: {
        file: "This file type is not allowed for the selected visibility.",
      },
    };
  }

  const extension = attachmentExtensionForMime(mimeType);
  if (!extension) {
    return {
      fieldErrors: {
        file: "This file type is not allowed for the selected visibility.",
      },
    };
  }

  const result = await runPermissionMutation(
    moduleForEntityType(entityType),
    "edit",
    async (context, supabase) => {
      await assertEntityExists(supabase, entityType, entityId);

      const approvedListing =
        visibility === "public"
          ? await findApprovedListing(supabase, entityType, entityId)
          : null;

      if (visibility === "public") {
        if (
          !(await hasPermission("listings", "publish")) &&
          !(await hasPermission("listings", "approve"))
        ) {
          throw new AttachmentActionError(
            "You are not approved to publish marketing images.",
          );
        }
        if (!approvedListing) {
          throw new AttachmentActionError(
            "This listing is not approved for publication.",
          );
        }
      }

      const bucket = bucketForVisibility(visibility);
      const path = buildAttachmentPath(
        entityType,
        entityId,
        `${randomUUID()}.${extension}`,
      );

      const { data, error: insertError } = await supabase
        .from("attachments")
        .insert({
          entity_type: entityType,
          entity_id: entityId,
          bucket,
          visibility,
          path,
          caption: parsed.data.caption || null,
          is_primary: parsed.data.isPrimary,
          sort_order: parsed.data.sortOrder,
          uploaded_by: context.userId,
        })
        .select(ATTACHMENT_COLUMNS)
        .maybeSingle();

      if (insertError || !data) {
        throw new Error(insertError?.message ?? SAVE_ERROR);
      }

      const uploaded = attachmentRowSchema.safeParse(data);
      if (!uploaded.success) {
        await supabase.from("attachments").delete().eq("id", data.id);
        throw new AttachmentActionError(SAVE_ERROR);
      }

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
          contentType: mimeType,
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        await supabase.from("attachments").delete().eq("id", uploaded.data.id);
        throw new AttachmentActionError(UPLOAD_ERROR);
      }

      return { slug: approvedListing?.slug ?? null };
    },
  );

  if (!result.ok) {
    return { error: result.error };
  }

  revalidate(paths);
  if (result.value.slug) {
    revalidatePath(`/properties/${result.value.slug}`);
  }

  return { success: "Attachment uploaded." };
}

export async function deleteAttachmentAction(
  attachmentId: string,
  revalidatePaths: string[],
  _previousState: PortfolioFormState,
  _formData: FormData,
): Promise<PortfolioFormState> {
  void _previousState;
  void _formData;

  if (!validId(attachmentId)) {
    return { error: "Invalid attachment." };
  }

  let paths: string[];
  try {
    paths = revalidatePathsSchema.parse(revalidatePaths);
  } catch {
    return { error: "Invalid attachment target." };
  }

  const result = await runStaffMutation(async (_context, supabase) => {
    const { data, error } = await supabase
      .from("attachments")
      .select(ATTACHMENT_COLUMNS)
      .eq("id", attachmentId)
      .maybeSingle();

    if (error || !data) {
      throw new AttachmentActionError("Unable to load the attachment.");
    }

    const attachment = attachmentRowSchema.safeParse(data);
    if (!attachment.success) {
      throw new AttachmentActionError("Unable to load the attachment.");
    }
    if (!isManagedAttachmentEntityType(attachment.data.entity_type)) {
      throw new AttachmentActionError(
        "This attachment type cannot be managed here.",
      );
    }

    const targetModule = moduleForEntityType(attachment.data.entity_type);
    if (!(await hasPermission(targetModule, "delete"))) {
      throw new AttachmentActionError(
        "You do not have permission to manage this attachment.",
      );
    }

    const { error: deleteError } = await supabase
      .from("attachments")
      .delete()
      .eq("id", attachmentId);
    if (deleteError) {
      throw new AttachmentActionError(DELETE_ERROR);
    }

    if (VALID_BUCKETS.has(attachment.data.bucket)) {
      // The registry row is the access boundary. If object cleanup fails, the
      // orphaned object cannot be selected by any storage policy.
      await supabase.storage
        .from(attachment.data.bucket)
        .remove([attachment.data.path]);
    }

    return { deleted: true };
  });

  if (!result.ok) {
    return { error: result.error };
  }

  revalidate(paths);
  return { success: "Attachment deleted." };
}
