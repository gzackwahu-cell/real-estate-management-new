"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteAttachmentAction,
  uploadAttachmentAction,
} from "@/lib/portfolio/attachment-actions";
import type { AttachmentView } from "@/lib/portfolio/attachment-queries";
import type {
  ManagedAttachmentEntityType,
  PortfolioFormState,
} from "@/lib/portfolio/validation";
import { FormField } from "./form-field";

const initialState: PortfolioFormState = {};

const ALL_ACCEPT =
  "image/jpeg,image/png,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain";
const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";

function displayName(path: string): string {
  return path.split("/").filter(Boolean).slice(-1)[0] ?? path;
}

function DeleteAttachmentButton({
  attachmentId,
  revalidatePaths,
}: {
  attachmentId: string;
  revalidatePaths: string[];
}) {
  const action = deleteAttachmentAction.bind(null, attachmentId, revalidatePaths);
  const [state, formAction, pending] = useActionState<PortfolioFormState, FormData>(
    action,
    initialState,
  );

  return (
    <form action={formAction} className="flex items-center gap-2">
      <Button
        type="submit"
        variant="destructive"
        size="xs"
        disabled={pending}
      >
        {pending ? "Deleting..." : "Delete"}
      </Button>
      {state.error ? (
        <span className="text-xs text-destructive" role="alert">
          {state.error}
        </span>
      ) : null}
    </form>
  );
}

export function AttachmentManager({
  entityType,
  entityId,
  attachments,
  revalidatePaths,
  canUpload = false,
  canDelete = false,
  allowPublic = false,
  emptyMessage = "No attachments have been added yet.",
}: {
  entityType: ManagedAttachmentEntityType;
  entityId: string;
  attachments: AttachmentView[];
  revalidatePaths: string[];
  canUpload?: boolean;
  canDelete?: boolean;
  allowPublic?: boolean;
  emptyMessage?: string;
}) {
  const action = uploadAttachmentAction.bind(
    null,
    entityType,
    entityId,
    revalidatePaths,
  );
  const [state, formAction, pending] = useActionState<PortfolioFormState, FormData>(
    action,
    initialState,
  );
  const errors = state.fieldErrors ?? {};

  return (
    <div className="space-y-5">
      {canUpload ? (
        <form
          action={formAction}
          encType="multipart/form-data"
          className="space-y-4 rounded-lg border bg-muted/20 p-4"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              name="file"
              label="File"
              error={errors.file}
              hint={`Max 10 MB. ${allowPublic ? "Public images: JPEG, PNG or WebP." : "Private files: images, PDF, Word or TXT."}`}
            >
              <Input
                id="file"
                name="file"
                type="file"
                accept={allowPublic ? IMAGE_ACCEPT : ALL_ACCEPT}
                required
              />
            </FormField>

            <FormField
              name="visibility"
              label="Visibility"
              error={errors.visibility}
              hint={
                allowPublic
                  ? "Public requires a published, active listing and publish approval."
                  : "Private files are never served to public visitors."
              }
            >
              {allowPublic ? (
                <Select id="visibility" name="visibility" defaultValue="private">
                  <option value="private">Private</option>
                  <option value="public">Public marketing image</option>
                </Select>
              ) : (
                <>
                  <input type="hidden" name="visibility" value="private" />
                  <Input id="visibility" value="Private" readOnly disabled />
                </>
              )}
            </FormField>
          </div>

          <FormField name="caption" label="Caption" error={errors.caption}>
            <Textarea
              id="caption"
              name="caption"
              rows={2}
              placeholder="Optional caption"
              maxLength={240}
            />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              name="sortOrder"
              label="Sort order"
              error={errors.sortOrder}
            >
              <Input
                id="sortOrder"
                name="sortOrder"
                type="number"
                min={0}
                max={10000}
                defaultValue={0}
              />
            </FormField>
            {allowPublic ? (
              <label className="flex items-end gap-2 pb-2 text-sm">
                <input
                  type="checkbox"
                  name="isPrimary"
                  className="size-4"
                />
                Set as primary marketing image
              </label>
            ) : null}
          </div>

          {state.error ? (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          ) : null}
          {state.success ? (
            <p className="text-sm text-emerald-700" role="status">
              {state.success}
            </p>
          ) : null}

          <Button type="submit" disabled={pending}>
            {pending ? "Uploading..." : "Upload attachment"}
          </Button>
        </form>
      ) : null}

      {attachments.length === 0 ? (
        <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </p>
      ) : (
        <ul className="space-y-2 text-sm">
          {attachments.map((attachment) => (
            <li
              key={attachment.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-danwell-navy">
                  {attachment.caption || displayName(attachment.path)}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {attachment.visibility === "public"
                    ? "Approved marketing image"
                    : "Private document"}
                  {" · "}
                  {attachment.bucket}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {attachment.url ? (
                  <a
                    href={attachment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-danwell-teal hover:underline"
                  >
                    View ↗
                  </a>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    Preview unavailable
                  </span>
                )}
                {canDelete ? (
                  <DeleteAttachmentButton
                    attachmentId={attachment.id}
                    revalidatePaths={revalidatePaths}
                  />
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
