import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/*/dashboard", "/*/admin", "/*/login", "/*/register", "/api/", "/auth/", "/go/"] }],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
