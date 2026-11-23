import Link from "next/link";
import { StatusBadge } from "@/components/portfolio/status-badge";
import { formatDateTime } from "@/lib/finance/constants";
import {
  notificationEventLabel,
  safeInternalLink,
  type NotificationRecord,
} from "@/lib/notifications/queries";
import { NotificationReadButton } from "./notification-actions";

type NotificationListProps = {
  notifications: readonly NotificationRecord[];
  canMarkRead: boolean;
  markReadAction: (id: string) => Promise<{
    ok?: boolean;
    error?: string;
    message?: string;
  }>;
};

export function NotificationList({
  notifications,
  canMarkRead,
  markReadAction,
}: NotificationListProps) {
  return (
    <ul className="divide-y rounded-xl border bg-card">
      {notifications.map((notification) => {
        const href = safeInternalLink(notification.link);
        const isUnread = notification.status === "unread";

        return (
          <li
            key={notification.id}
            className={`flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start sm:justify-between ${
              isUnread ? "bg-danwell-teal/[0.03]" : ""
            }`}
          >
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-danwell-navy">
                  {notification.title}
                </span>
                <StatusBadge
                  label={notificationEventLabel(notification.event_type)}
                  tone="neutral"
                />
                {isUnread ? (
                  <StatusBadge label="Unread" tone="warning" />
                ) : null}
              </div>
              <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                {notification.message}
              </p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span>{formatDateTime(notification.created_at)}</span>
                {notification.entity_type ? (
                  <span>Source: {notification.entity_type}</span>
                ) : null}
                {href ? (
                  <Link href={href} className="text-danwell-teal hover:underline">
                    Open related record
                  </Link>
                ) : null}
              </div>
            </div>
            {canMarkRead && isUnread ? (
              <NotificationReadButton
                notificationId={notification.id}
                action={markReadAction}
              />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
