import type { AttachmentView } from "@/lib/portfolio/attachment-queries";

function displayName(path: string): string {
  return path.split("/").filter(Boolean).slice(-1)[0] ?? path;
}

export function AttachmentList({
  attachments,
  emptyMessage = "No attachments have been added yet.",
}: {
  attachments: AttachmentView[];
  emptyMessage?: string;
}) {
  if (attachments.length === 0) {
    return (
      <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </p>
    );
  }

  return (
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
        </li>
      ))}
    </ul>
  );
}
