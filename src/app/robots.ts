import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/jsonld";

export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/", disallow: ["/checkout", "/api", "/admin"] }, sitemap: `${SITE_URL}/sitemap.xml` };
}
