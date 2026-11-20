import type { ReactNode } from "react";
import { AGENCY } from "@/lib/constants/agency";

export function whatsappHref(message?: string): string {
  if (!message) {
    return AGENCY.whatsappUrl;
  }
  return `${AGENCY.whatsappUrl}?text=${encodeURIComponent(message)}`;
}

export function WhatsAppLink({
  message,
  children,
  className,
}: {
  message?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <a
      href={whatsappHref(message)}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {children}
    </a>
  );
}
