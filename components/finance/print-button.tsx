"use client";

import { Button } from "@/components/ui/button";

type PrintButtonProps = {
  label?: string;
};

export function PrintButton({ label = "Print receipt" }: PrintButtonProps) {
  return (
    <Button type="button" variant="outline" onClick={() => window.print()}>
      {label}
    </Button>
  );
}
