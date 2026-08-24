import type { MetadataRoute } from "next";
import { appConfig } from "@/lib/config";

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = appConfig.url.replace(/\/$/, "");
  return [
    { url: origin, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${origin}/pricing`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${origin}/login`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: `${origin}/signup`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.4 },
  ];
}
