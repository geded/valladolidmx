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
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { resolveCanonicalPath } from "@/lib/navigation";

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

const LANDING_KINDS = new Set(["landing", "campaign", "micrositio", "promotion"]);

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const [published, entities] = await Promise.all([
          listPublishedPagesForSitemap().catch(() => []),
          fetchPublicEntities().catch(
            () => ({ destinos: [], empresas: [], productos: [], eventos: [] }) as PublicEntities,
          ),
        ]);
        const dynamicEntries: SitemapEntry[] = published.map((row) => {
          const priority =
            typeof row.priority === "number"
              ? clamp01(row.priority)
              : row.featured
                ? 0.8
                : 0.6;
          const prefix = LANDING_KINDS.has(row.page_type) ? "/l" : "/p";
          return {
            path: `${prefix}/${row.slug}`,
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

        const entityEntries: SitemapEntry[] = [
          ...entities.destinos.map((r) => ({
            path: `/oriente-maya/${r.slug}`,
            lastmod: r.updated_at ?? undefined,
            changefreq: "weekly" as const,
            priority: "0.8",
          })),
          // Sub-ola N2.3 · Fase 1 — sitemap emite la URL territorial
          // cuando la empresa tiene destino y categoría publicados.
          // Fallback a la URL legacy (`/marketplace/:slug`,
          // `/producto/:slug`) sólo si falta destino o categoría.
          // Rutas legacy siguen 200 OK; no se emiten 301 todavía.
          ...entities.empresas.map((r) => ({
            path:
              r.destination_slug && r.category_slug
                ? resolveCanonicalPath({
                    kind: "business",
                    slug: r.slug,
                    category: r.category_slug,
                    destination: r.destination_slug,
                  })
                : `/marketplace/${r.slug}`,
            lastmod: r.updated_at ?? undefined,
            changefreq: "weekly" as const,
            priority: "0.7",
          })),
          ...entities.productos.map((r) => ({
            path:
              r.destination_slug && r.category_slug && r.business_slug
                ? resolveCanonicalPath({
                    kind: "product",
                    slug: r.slug,
                    business: r.business_slug,
                    category: r.category_slug,
                    destination: r.destination_slug,
                  })
                : `/producto/${r.slug}`,
            lastmod: r.updated_at ?? undefined,
            changefreq: "weekly" as const,
            priority: "0.6",
          })),
          ...entities.eventos.map((r) => ({
            path: `/eventos/${r.slug}`,
            lastmod: r.updated_at ?? undefined,
            changefreq: "daily" as const,
            priority: "0.7",
          })),
        ];
        const entries = [...STATIC_ENTRIES, ...dynamicEntries, ...entityEntries];
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

interface EntityRow { slug: string; updated_at: string | null }
interface BusinessRow extends EntityRow {
  destination_slug: string | null;
  category_slug: string | null;
}
interface ProductRow extends EntityRow {
  destination_slug: string | null;
  category_slug: string | null;
  business_slug: string | null;
}
interface PublicEntities {
  destinos: EntityRow[];
  empresas: BusinessRow[];
  productos: ProductRow[];
  eventos: EntityRow[];
}

async function fetchPublicEntities(): Promise<PublicEntities> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return { destinos: [], empresas: [], productos: [], eventos: [] };
  const sb = createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
  const [d, b, p, e] = await Promise.all([
    sb.from("destinations").select("slug, updated_at").eq("status", "published").is("deleted_at", null).limit(500),
    sb
      .from("businesses")
      .select(
        "slug, updated_at, destinations!businesses_destination_id_fkey ( slug ), business_categories!businesses_primary_category_id_fkey ( slug )",
      )
      .eq("status", "published")
      .is("deleted_at", null)
      .limit(1000),
    sb
      .from("products")
      .select(
        "slug, updated_at, businesses!inner ( slug, status, deleted_at, destinations!businesses_destination_id_fkey ( slug ), business_categories!businesses_primary_category_id_fkey ( slug ) )",
      )
      .eq("status", "published")
      .is("deleted_at", null)
      .limit(2000),
    sb.from("events").select("slug, updated_at").eq("status", "published").is("deleted_at", null).limit(1000),
  ]);
  const norm = (rows: { slug: string; updated_at: string | null }[] | null) =>
    (rows ?? []).filter((r) => typeof r.slug === "string" && r.slug.length > 0);
  const pickSlug = (rel: unknown): string | null => {
    const s = (rel as { slug?: unknown } | null)?.slug;
    return typeof s === "string" && s.length > 0 ? s : null;
  };
  const empresas: BusinessRow[] = ((b.data as any[]) ?? [])
    .filter((r) => typeof r?.slug === "string" && r.slug.length > 0)
    .map((r) => ({
      slug: r.slug as string,
      updated_at: (r.updated_at as string | null) ?? null,
      destination_slug: pickSlug(r.destinations),
      category_slug: pickSlug(r.business_categories),
    }));
  const productos: ProductRow[] = ((p.data as any[]) ?? [])
    .filter((r) => typeof r?.slug === "string" && r.slug.length > 0)
    .map((r) => {
      const biz = r.businesses as any;
      return {
        slug: r.slug as string,
        updated_at: (r.updated_at as string | null) ?? null,
        business_slug: pickSlug(biz),
        destination_slug: pickSlug(biz?.destinations),
        category_slug: pickSlug(biz?.business_categories),
      };
    });
  return {
    destinos: norm(d.data as EntityRow[] | null),
    empresas,
    productos,
    eventos: norm(e.data as EntityRow[] | null),
  };
}