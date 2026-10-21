import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/jsonld";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/products"].map((path) => ({ url: `${SITE_URL}${path}` }));
}
