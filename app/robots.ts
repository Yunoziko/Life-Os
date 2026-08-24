import type { MetadataRoute } from "next";
import { appConfig } from "@/lib/config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/login", "/signup", "/pricing"],
        disallow: [
          "/dashboard",
          "/tasks",
          "/goals",
          "/projects",
          "/notes",
          "/habits",
          "/calendar",
          "/learning",
          "/analytics",
          "/automations",
          "/notifications",
          "/ai",
          "/settings",
          "/profile",
          "/finance",
          "/api/",
        ],
      },
    ],
    sitemap: `${appConfig.url.replace(/\/$/, "")}/sitemap.xml`,
  };
}
