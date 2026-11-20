import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/listings/constants";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/dashboard",
        "/owner",
        "/tenant",
        "/login",
        "/api/",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
