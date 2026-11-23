import { Suspense } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import {
  NotificationList,
} from "@/components/dashboard/notifications/notification-list";
import { MarkAllReadButton } from "@/components/dashboard/notifications/notification-actions";
import { EmptyState } from "@/components/portfolio/empty-state";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { hasPermission } from "@/lib/auth/dal";
import { withPermission } from "@/lib/auth/guards";
import { firstParam } from "@/lib/finance/constants";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/lib/notifications/actions";
import {
  getNotifications,
  getUnreadNotificationCount,
  type NotificationFilter,
} from "@/lib/notifications/queries";

type NotificationsPageProps = {
  searchParams: Promise<{
    status?: string | string[];
  }>;
};

const filters: readonly { value: NotificationFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "read", label: "Read" },
];

export default function NotificationsPage({ searchParams }: NotificationsPageProps) {
  return (
    <Suspense
      fallback={<p className="text-sm text-muted-foreground">Loading notifications...</p>}
    >
      <NotificationsContent searchParams={searchParams} />
    </Suspense>
  );
}

async function NotificationsContent({ searchParams }: NotificationsPageProps) {
  const params = await searchParams;
  const requestedStatus = firstParam(params.status);
  const filter: NotificationFilter =
    requestedStatus === "unread" || requestedStatus === "read"
      ? requestedStatus
      : "all";

  const { notifications, unreadCount, canMarkRead } = await withPermission(
    "notifications",
    "view",
    async (context, supabase) => {
      const [items, count, editAllowed] = await Promise.all([
        getNotifications(supabase, context.userId, filter),
        getUnreadNotificationCount(supabase, context.userId),
        hasPermission("notifications", "edit"),
      ]);
      return {
        notifications: items,
        unreadCount: count,
        canMarkRead: editAllowed,
      };
    },
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Communication"
        title="Notifications"
        description="In-app messages addressed to your account. Only your own notifications are loaded."
        actions={
          canMarkRead ? (
            <MarkAllReadButton
              unreadCount={unreadCount}
              action={markAllNotificationsReadAction}
            />
          ) : (
            <Badge tone="muted">Read only</Badge>
          )
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Unread"
          value={unreadCount}
          hint="Notifications awaiting review"
          icon={Bell}
          tone={unreadCount > 0 ? "gold" : "default"}
          href="/dashboard/notifications?status=unread"
        />
        <StatCard
          label="Showing"
          value={notifications.length}
          hint="Records in the current view"
        />
        <StatCard
          label="Status"
          value={canMarkRead ? "Can update" : "View only"}
          hint={
            canMarkRead
              ? "You can mark notifications as read"
              : "Your role has notification view access only"
          }
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg text-danwell-navy">Inbox</CardTitle>
            <CardDescription>
              Newest first · maintenance updates prepared for your account
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-1.5" aria-label="Notification status filter">
            {filters.map((item) => {
              const active = item.value === filter;
              return (
                <Link
                  key={item.value}
                  href={
                    item.value === "all"
                      ? "/dashboard/notifications"
                      : `/dashboard/notifications?status=${item.value}`
                  }
                  aria-current={active ? "page" : undefined}
                >
                  <Badge tone={active ? "neutral" : "muted"}>{item.label}</Badge>
                </Link>
              );
            })}
          </div>
        </CardHeader>
        <CardContent>
          {!canMarkRead ? (
            <p className="mb-3 text-xs text-muted-foreground">
              Your role can view notifications but does not have notifications:edit
              permission, so read/unread changes are disabled.
            </p>
          ) : null}
          {notifications.length === 0 ? (
            <EmptyState
              title="No notifications here"
              description={
                filter === "all"
                  ? "Maintenance updates addressed to you will appear here."
                  : `No ${filter} notifications are available.`
              }
            />
          ) : (
            <NotificationList
              notifications={notifications}
              canMarkRead={canMarkRead}
              markReadAction={markNotificationReadAction}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
