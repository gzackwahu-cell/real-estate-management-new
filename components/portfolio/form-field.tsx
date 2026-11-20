import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";

type FormFieldProps = {
  name: string;
  label: string;
  error?: string;
  hint?: string;
  className?: string;
  children: ReactNode;
};

export function FormField({
  name,
  label,
  error,
  hint,
  className,
  children,
}: FormFieldProps) {
  return (
    <div className={className}>
      <Label htmlFor={name}>{label}</Label>
      <div className="mt-1.5">{children}</div>
      {hint && !error ? (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
      {error ? (
        <p className="mt-1 text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
