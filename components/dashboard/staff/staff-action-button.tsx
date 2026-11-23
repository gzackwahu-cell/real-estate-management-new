"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { StaffActionState } from "@/lib/auth/staff-queries";

export type StaffConfirm = {
  title: string;
  description: string;
  confirmLabel?: string;
};

type StaffActionButtonProps = {
  label: string;
  action: () => Promise<StaffActionState>;
  confirm?: StaffConfirm;
  destructive?: boolean;
  disabled?: boolean;
  size?: "xs" | "sm";
  variant?: "default" | "outline" | "ghost" | "destructive";
};

export function StaffActionButton({
  label,
  action,
  confirm,
  destructive = false,
  disabled = false,
  size = "xs",
  variant = "outline",
}: StaffActionButtonProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function run() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        setMessage(result.message ?? "Saved.");
        return;
      }
      setError(result.error ?? "Unable to save this change.");
    });
  }

  const button = (
    <Button
      type="button"
      size={size}
      variant={variant}
      disabled={disabled || pending}
      onClick={confirm ? undefined : run}
    >
      {pending ? "Working..." : label}
    </Button>
  );

  return (
    <span className="inline-flex flex-col items-start gap-0.5">
      {confirm ? (
        <ConfirmDialog
          trigger={button}
          title={confirm.title}
          description={confirm.description}
          confirmLabel={confirm.confirmLabel ?? "Confirm"}
          destructive={destructive}
          onConfirm={run}
        />
      ) : (
        button
      )}
      {error ? <span className="max-w-52 text-[10px] text-destructive">{error}</span> : null}
      {message ? (
        <span className="max-w-52 text-[10px] text-emerald-700">{message}</span>
      ) : null}
    </span>
  );
}
