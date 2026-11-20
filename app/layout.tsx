import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { SITE_METADATA_BASE } from "@/lib/listings/constants";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  metadataBase: SITE_METADATA_BASE,
  title: {
    default: "Danwell Property Management Agency",
    template: "%s | Danwell Property Management Agency",
  },
  description:
    "Property management, rentals, sales and owner services in Kenya.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body>{children}</body>
    </html>
  );
}
