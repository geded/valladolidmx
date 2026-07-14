import { createFileRoute } from "@tanstack/react-router";
import { Suspense, lazy } from "react";
import { useServerFn } from "@tanstack/react-start";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { SITE } from "@/config/site";
import { getPublishedHomeComposition } from "@/lib/experience-builder/public-reads.functions";
import { CompositionRenderer } from "@/lib/experience-builder/composition-renderer";
import { PublicShell } from "@/components/discovery";
// H2·P3 — `ContinuityWelcomeSurface` sólo se muestra a viajeros con
// estado de continuidad (visita previa detectada). Para el primer
// visitante y para SSR renderiza null: lo diferimos para no cargarlo
// en el entry principal. Fallback: null (sin CLS).
const ContinuityWelcomeSurface = lazy(() =>
  import("@/components/traveler/ContinuityWelcomeSurface").then((m) => ({
    default: m.ContinuityWelcomeSurface,
  })),
);
import { useSectionEditWrap } from "@/components/experience-builder/SectionEditOverlay";
import { buildPublicHead, pickFirstMediaUrl, webPageJsonLd } from "@/lib/discovery/seo";
import heroLcpImage from "@/assets/brand/hero/bg01.webp";
import {
  getDiscoverySection,
  type DiscoverySectionKind,
} from "@/lib/discovery/sections-registry";

const publishedHomeQuery = queryOptions({
  queryKey: ["eb", "published-home", "default"],
  queryFn: () => getPublishedHomeComposition({ data: { variant_key: "default" } }),
  staleTime: 60_000,
});

export const Route = createFileRoute("/")({
  head: (ctx) => {
    const loaderData = ctx.loaderData as { seo?: Record<string, unknown> | null; fallbackImage?: string | null } | undefined;
    const seo = (loaderData?.seo ?? {}) as {
      title?: string;
      description?: string;
      og_image?: string;
      canonical?: string;
      noindex?: boolean;
    };
    const title = seo.title?.trim() || `${SITE.name} · Despierta en el Oriente Maya`;
    const description = seo.description?.trim() || SITE.default_description;
    const path = seo.canonical?.trim() || "/";
    const ogImage = seo.og_image?.trim() || loaderData?.fallbackImage || undefined;
    const head = buildPublicHead({
      title,
      description,
      path,
      ogType: "website",
      ogImage,
      noindex: Boolean(seo.noindex),
      jsonLd: seo.noindex ? undefined : [webPageJsonLd({ title, description, path, image: ogImage })],
    });
    // H2 · LCP preload: la imagen del hero de la Home es el LCP dominante en móvil.
    return {
      ...head,
      links: [
        ...(head.links ?? []),
        { rel: "preload", as: "image", href: heroLcpImage, fetchpriority: "high" as const },
      ],
    };
  },
  loader: async ({ context }) => {
    // Prefetch para SSR; nunca lanza — getPublishedHomeComposition cae a null
    // ante cualquier error, garantizando que la Home siempre cargue.
    const published = await context.queryClient.ensureQueryData(publishedHomeQuery);
    return {
      seo: published?.snapshot?.chrome?.seo ?? null,
      fallbackImage: published?.snapshot ? pickFirstMediaUrl(published.snapshot) ?? null : null,
    };
  },
  component: HomePage,
});

/**
 * HomePage (Etapa 15.10.3)
 *
 * Renderiza la Home pública a partir de una composición publicada
 * desde el Experience Builder. Si todavía no existe una composición
 * publicada para `page_type='home'` (o si la lectura falla), cae al
 * Home legacy hardcodeado — Progressive Migration: cada bloque puede
 * activarse o revertirse de forma independiente sin afectar el sitio.
 */
function HomePage() {
  const { data: published } = useQuery(publishedHomeQuery);
  const editWrap = useSectionEditWrap({ pageSlug: "home" });

  if (published?.snapshot) {
    return (
      <PublicShell variant="hero">
        <Suspense fallback={null}>
          <ContinuityWelcomeSurface />
        </Suspense>
        <CompositionRenderer tree={published.snapshot} pageType="home" wrap={editWrap} />
      </PublicShell>
    );
  }

  return <LegacyHome />;
}

/**
 * LegacyHome — Fallback hardcodeado (Doc 12). Se conserva hasta que la
 * composición de Home esté publicada y validada en producción.
 */
/**
 * Orden canónico de bloques del fallback Home — Discovery Sections Registry
 * es la única fuente de verdad para los componentes.
 */
const HOME_FALLBACK_SECTIONS: readonly DiscoverySectionKind[] = [
  "hero",
  "destinos",
  "categorias",
  "eventos",
  "promociones",
  "rutas",
  "consejo-alux",
  "arma-tu-viaje",
  "empresas",
  "resenas",
];

function LegacyHome() {
  return (
    <PublicShell variant="hero">
      <Suspense fallback={null}>
        <ContinuityWelcomeSurface />
      </Suspense>
      {HOME_FALLBACK_SECTIONS.map((kind) => {
        const Section = getDiscoverySection(kind).component;
        return <Section key={kind} />;
      })}
    </PublicShell>
  );
}
