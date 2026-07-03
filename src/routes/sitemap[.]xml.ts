/**
 * Sitemap dinámico (15.10.8.5).
 *
 * Sirve `/sitemap.xml` combinando las rutas estáticas del Discovery
 * Layer con las páginas publicadas desde el Experience Builder.
 * Respeta destacados (`snapshot.chrome.seo.featured`) elevando su
 * prioridad; el orden secundario es por `published_at` desc.
 */
import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { listPublishedPagesForSitemap } from "@/lib/experience-builder/eb-sitemap.functions";

const BASE_URL = "https://valladolidmx.lovable.app";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

const STATIC_ENTRIES: SitemapEntry[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/oriente-maya", changefreq: "weekly", priority: "0.9" },
  { path: "/experiencias", changefreq: "weekly", priority: "0.8" },
  { path: "/hoteles", changefreq: "weekly", priority: "0.8" },
  { path: "/restaurantes", changefreq: "weekly", priority: "0.8" },
  { path: "/eventos", changefreq: "weekly", priority: "0.8" },
  { path: "/arma-tu-viaje", changefreq: "monthly", priority: "0.9" },
  { path: "/alux", changefreq: "monthly", priority: "0.7" },
  { path: "/empresas", changefreq: "monthly", priority: "0.7" },
  { path: "/marketplace", changefreq: "weekly", priority: "0.7" },
];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const published = await listPublishedPagesForSitemap();
        const dynamicEntries: SitemapEntry[] = published.map((row) => {
          const priority =
            typeof row.priority === "number"
              ? clamp01(row.priority)
              : row.featured
                ? 0.8
                : 0.6;
          return {
            path: `/p/${row.slug}`,
            lastmod: row.updated_at ?? row.published_at ?? undefined,
            changefreq: "weekly",
            priority: priority.toFixed(1),
          };
        });
        // Featured primero (prioridad numérica desc), luego por lastmod desc.
        dynamicEntries.sort((a, b) => {
          const pa = Number(a.priority ?? "0");
          const pb = Number(b.priority ?? "0");
          if (pb !== pa) return pb - pa;
          return (b.lastmod ?? "").localeCompare(a.lastmod ?? "");
        });

        const entries = [...STATIC_ENTRIES, ...dynamicEntries];
        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.lastmod ? `    <lastmod>${new Date(e.lastmod).toISOString()}</lastmod>` : null,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
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
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0.6;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}