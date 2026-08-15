import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { fetchYoutubeFeed } from "@/lib/youtube";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const forwardedHost =
          url.hostname === "localhost" ? request.headers.get("x-forwarded-host") : null;
        const base = forwardedHost ? `https://${forwardedHost}` : url.origin;

        const feed = await fetchYoutubeFeed();
        const entries = [
          { path: "/", changefreq: "daily", priority: "1.0", lastmod: undefined as string | undefined },
          ...feed.videos.map((v) => ({
            path: `/video/${v.id}`,
            changefreq: "monthly",
            priority: "0.8",
            lastmod: v.updated || v.published || undefined,
          })),
        ];

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${base}${e.path}</loc>`,
            e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
            `    <changefreq>${e.changefreq}</changefreq>`,
            `    <priority>${e.priority}</priority>`,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=1800",
          },
        });
      },
    },
  },
});
