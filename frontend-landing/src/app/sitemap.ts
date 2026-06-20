import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: siteUrl.href,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
      images: [new URL("/opengraph-image", siteUrl).href],
    },
  ];
}
