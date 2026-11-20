import Link from "next/link";
import { formatDate, NOTIFICATION_EVENT_LABELS } from "@/lib/maintenance/constants";
import type { MaintenanceNotification } from "@/lib/maintenance/validation";

type MaintenanceNotificationsProps = {
  notifications: MaintenanceNotification[];
};

export function MaintenanceNotifications({ notifications }: MaintenanceNotificationsProps) {
  if (notifications.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No maintenance notifications have been prepared yet.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {notifications.map((notification) => {
        const content = (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-danwell-navy">{notification.title}</p>
              <p className="text-xs text-muted-foreground">
                {formatDate(notification.created_at?.slice(0, 10))}
              </p>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{notification.message}</p>
            <p className="mt-1 text-xs text-danwell-teal">
              {NOTIFICATION_EVENT_LABELS[notification.event_type] ?? notification.event_type}
            </p>
          </>
        );

        return (
          <li key={notification.id} className="rounded-lg border p-3">
            {notification.link ? (
              <Link href={notification.link} className="block hover:underline">
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
