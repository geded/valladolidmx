/**
 * /l/$slug — Landing pública del Experience Builder (Etapa 15.10.4b · Fase 3)
 *
 * Punto único de resolución pública. Hoy resuelve Landings; mismo loader y
 * mismo renderer servirán destinos, empresas, productos, eventos, bodas,
 * promociones, micrositios y contenido generado por IA en etapas futuras
 * — sin tocar este archivo.
 *
 * - SSR vía createServerFn pública (resolver eb_page_resolve_public).
 * - Variants resueltas por idioma/audiencia/segmento/dispositivo/origen
 *   con FALLBACK obligatorio al árbol base.
 * - Render con el MISMO composition-renderer del Studio y del Preview —
 *   garantía de paridad 1:1.
 * - SEO extensible: title, description, OG, hreflang, robots, canonical,
 *   JSON-LD por tipo de contenido.
 */

import { createFileRoute, notFound, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  ebResolvePublicPage,
  applyVariantOverrides,
  type PublicPageResolved,
} from "@/lib/experience-builder/eb-public.functions";
import { CompositionRenderer } from "@/lib/experience-builder/composition-renderer";
import { buildDemoContext } from "@/lib/experience-builder/dynamic-variables";
import { buildPublicHead, DISCOVERY_ORIGIN } from "@/lib/discovery/seo";

function resolveLandingQuery(slug: string) {
  return {
    queryKey: ["eb_public_landing", slug] as const,
    queryFn: () =>
      ebResolvePublicPage({ data: { slug, tenant_id: null, ctx: {} } }) as Promise<
        PublicPageResolved | null
      >,
    staleTime: 60_000,
  };
}

export const Route = createFileRoute("/l/$slug")({
  loader: async ({ params, context }) => {
    const page = await context.queryClient.ensureQueryData(
      resolveLandingQuery(params.slug),
    );
    if (!page) throw notFound();
    return { page };
  },
  head: ({ params, loaderData }) => {
    const page = loaderData?.page;
    if (!page) {
      return buildPublicHead({
        title: "Página no encontrada",
        description: "Esta página no existe o aún no ha sido publicada.",
        path: `/l/${params.slug}`,
        noindex: true,
      });
    }
    const seo = page.seo ?? {};
    const og = page.open_graph ?? {};
    const title = (seo.title as string) ?? page.name;
    const description = (seo.description as string) ?? "";
    const ogImage = (og.image as string) ?? (seo.image as string) ?? null;
    const robots = (seo.robots as string) ?? undefined;
    const path = `/l/${params.slug}`;
    const url = `${DISCOVERY_ORIGIN}${path}`;

    const jsonLd: Array<Record<string, unknown>> = [];
    const customSchema = (page.schema_org ?? null) as Record<string, unknown> | null;
    if (customSchema && Object.keys(customSchema).length > 0) jsonLd.push(customSchema);
    jsonLd.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Inicio", item: DISCOVERY_ORIGIN },
        { "@type": "ListItem", position: 2, name: page.name, item: url },
      ],
    });

    const head = buildPublicHead({
      title: (og.title as string) ?? title,
      description: (og.description as string) ?? description,
      path,
      ogType: ((og.type as string) ?? "website") as never,
      ogImage: ogImage ?? undefined,
      robots,
      jsonLd,
    });

    // hreflang alternates (extensibles vía seo.hreflang)
    const hreflang = (seo.hreflang as Record<string, string> | undefined) ?? null;
    if (hreflang && typeof hreflang === "object") {
      for (const [lang, href] of Object.entries(hreflang)) {
        head.links.push({
          rel: "alternate",
          hreflang: lang,
          href: href.startsWith("http") ? href : `${DISCOVERY_ORIGIN}${href}`,
        });
      }
    }

    return head;
  },
  notFoundComponent: NotFoundLanding,
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-xl p-8 text-center">
      <h1 className="text-xl font-semibold">No se pudo cargar la página</h1>
      <p className="mt-2 text-sm text-muted-foreground">{(error as Error).message}</p>
    </div>
  ),
  component: PublicLanding,
});

function NotFoundLanding() {
  return (
    <main className="mx-auto max-w-xl p-12 text-center">
      <h1 className="text-2xl font-semibold">Página no encontrada</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Esta landing no existe o aún no ha sido publicada.
      </p>
    </main>
  );
}

function PublicLanding() {
  const { slug } = useParams({ from: "/l/$slug" });
  const { data: page } = useQuery(resolveLandingQuery(slug));

  const renderTree = useMemo(() => {
    if (!page) return null;
    return applyVariantOverrides(page.tree, page.variant?.overrides ?? null);
  }, [page]);

  if (!page || !renderTree) return null;

  const themeStyle = buildThemeStyle(page.theme?.tokens);
  // Variable context (en futuras etapas se hidrata con tenant/destination/etc).
  const variableContext = buildDemoContext();

  return (
    <main className="min-h-screen" style={themeStyle} data-eb-page={page.id} data-eb-cache={page.cache_version}>
      <CompositionRenderer tree={renderTree} variableContext={variableContext} />
    </main>
  );
}

function buildThemeStyle(tokens?: Record<string, unknown> | null): React.CSSProperties {
  if (!tokens || typeof tokens !== "object") return {};
  const style: Record<string, string> = {};
  for (const [k, v] of Object.entries(tokens)) {
    if (typeof v === "string" || typeof v === "number") {
      const cssKey = k.startsWith("--") ? k : `--${k.replace(/_/g, "-")}`;
      style[cssKey] = String(v);
    }
  }
  return style as React.CSSProperties;
}