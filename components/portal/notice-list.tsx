import Link from "next/link";
import { StatusBadge } from "@/components/portfolio/status-badge";
import {
  formatDate,
  NOTIFICATION_EVENT_LABELS,
} from "@/lib/maintenance/constants";
import type { MaintenanceNotification } from "@/lib/maintenance/validation";

export function NoticeList({
  notifications,
  limit,
  emptyMessage = "There are no notices for your account yet.",
}: {
  notifications: MaintenanceNotification[];
  limit?: number;
  emptyMessage?: string;
}) {
  const notices =
    typeof limit === "number" ? notifications.slice(0, limit) : notifications;

  if (notices.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{emptyMessage}</p>
    );
  }

  return (
    <ul className="space-y-3">
      {notices.map((notice) => {
        const content = (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-danwell-navy">
                {notice.title}
              </p>
              <div className="flex items-center gap-2">
                {notice.status === "unread" ? (
                  <StatusBadge label="New" tone="warning" />
                ) : null}
                <span className="text-xs text-muted-foreground">
                  {formatDate(notice.created_at?.slice(0, 10))}
                </span>
              </div>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {notice.message}
            </p>
            <p className="mt-1 text-xs text-danwell-teal">
              {NOTIFICATION_EVENT_LABELS[notice.event_type] ??
                notice.event_type}
            </p>
          </>
        );

        return (
          <li key={notice.id} className="rounded-lg border p-3">
            {notice.link ? (
              <Link href={notice.link} className="block hover:underline">
                {content}
              </Link>
            ) : (
              content
            )}
          </li>
        );
      })}
    </ul>
  );
}
