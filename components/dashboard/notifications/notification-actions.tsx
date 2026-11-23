"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

type NotificationActionState = {
  ok?: boolean;
  error?: string;
  message?: string;
};

function errorFrom(result: NotificationActionState): string | null {
  if (result.ok) return null;
  return result.error ?? "Unable to update notifications. Please try again.";
}

export function MarkAllReadButton({
  unreadCount,
  action,
}: {
  unreadCount: number;
  action: () => Promise<NotificationActionState>;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={pending || unreadCount === 0}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await action();
            const failure = errorFrom(result);
            if (failure) setError(failure);
          });
        }}
      >
        {pending
          ? "Updating..."
          : unreadCount > 0
            ? `Mark all read (${unreadCount})`
            : "All caught up"}
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

export function NotificationReadButton({
  notificationId,
  action,
}: {
  notificationId: string;
  action: (id: string) => Promise<NotificationActionState>;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        size="xs"
        variant="ghost"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await action(notificationId);
            const failure = errorFrom(result);
            if (failure) setError(failure);
          });
        }}
      >
        {pending ? "Saving..." : "Mark read"}
      </Button>
      {error ? <p className="max-w-40 text-right text-[11px] text-destructive">{error}</p> : null}
    </div>
  );
}
