import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://runforacause.in";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Logged-in surfaces, write APIs, and uploaded files are not for indexing.
        disallow: [
          "/admin",
          "/admin/*",
          "/manager",
          "/manager/*",
          "/runner",
          "/runner/*",
          "/account",
          "/account/*",
          "/dashboard",
          "/api/",
          "/uploads/",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
