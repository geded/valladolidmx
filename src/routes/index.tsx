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
import {
  HOME_PREMIUM_G4_CONTRACT_VERSION,
  homePremiumG4DefaultConfig,
} from "@/components/home-premium/home-premium-config";
import type { CompositionTree } from "@/lib/experience-builder/composition-tree";
import { publishedDestinationsQueryOptions } from "@/lib/destinations/destination-labels";
import { homeFeaturedCategoriesQueryOptions } from "@/lib/cms/home-featured-categories-query";

const publishedHomeQuery = queryOptions({
  queryKey: ["eb", "published-home", "default"],
  queryFn: () => getPublishedHomeComposition({ data: { variant_key: "default" } }),
  staleTime: 60_000,
});

export const Route = createFileRoute("/")({
  head: (ctx) => {
    const loaderData = ctx.loaderData as
      { seo?: Record<string, unknown> | null; fallbackImage?: string | null } | undefined;
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
      jsonLd: seo.noindex
        ? undefined
        : [webPageJsonLd({ title, description, path, image: ogImage })],
    });
    // Sólo precarga el medio acreditado por la composición publicada. El
    // fallback editorial no inventa ni acopla una portada desde el código.
    return {
      ...head,
      links: ogImage
        ? [
            ...(head.links ?? []),
            { rel: "preload", as: "image", href: ogImage, fetchPriority: "high" as const },
          ]
        : head.links,
    };
  },
  loader: async ({ context }) => {
    // Prefetch para SSR; nunca lanza — getPublishedHomeComposition cae a null
    // ante cualquier error, garantizando que la Home siempre cargue.
    const [published] = await Promise.all([
      context.queryClient.ensureQueryData(publishedHomeQuery),
      // Lote 3B — Destinos reales de CMS disponibles en SSR: la Home ya no
      // depende del fixture `DESTINOS_MOCK` para pintar la sección.
      context.queryClient.ensureQueryData(publishedDestinationsQueryOptions).catch(() => []),
      // Lote 3E — Categorías destacadas reales de CMS en SSR: el buscador del
      // Hero y la sección de categorías ya no dependen de `CATEGORIAS_MOCK`.
      context.queryClient.ensureQueryData(homeFeaturedCategoriesQueryOptions).catch(() => []),
    ]);
    return {
      seo: published?.snapshot?.chrome?.seo ?? null,
      fallbackImage: published?.snapshot ? (pickFirstMediaUrl(published.snapshot) ?? null) : null,
    };
  },
  component: HomePage,
});

/**
 * HomePage (Etapa 15.10.3)
 *
 * Renderiza la Home pública a partir de una composición publicada
 * desde el Experience Builder. Si todavía no existe una composición
 * publicada para `page_type='home'` (o si la lectura falla), instancia el
 * mismo bloque compuesto Premium G4 usado por Studio y publicación.
 */
function HomePage() {
  const { data: published } = useQuery(publishedHomeQuery);
  const editWrap = useSectionEditWrap({ pageSlug: "home" });

  if (published?.snapshot && hasHomePremiumAuthority(published.snapshot)) {
    return (
      <PublicShell variant="hero">
        <Suspense fallback={null}>
          <ContinuityWelcomeSurface />
        </Suspense>
        <CompositionRenderer tree={published.snapshot} pageType="home" wrap={editWrap} />
      </PublicShell>
    );
  }

  return (
    <PublicShell variant="hero">
      <Suspense fallback={null}>
        <ContinuityWelcomeSurface />
      </Suspense>
      <CompositionRenderer tree={HOME_PREMIUM_FALLBACK_TREE} pageType="home" wrap={editWrap} />
    </PublicShell>
  );
}

function hasHomePremiumAuthority(snapshot: unknown): boolean {
  return JSON.stringify(snapshot ?? null).includes('"vmx.home.premium-g4"');
}

/**
 * Fallback canónico de runtime. No duplica JSX ni contenido: instancia el
 * mismo bloque compuesto que consumen Studio, preview y publicación. Los
 * medios permanecen vacíos hasta que el resolutor real acredite una portada.
 */
const HOME_PREMIUM_FALLBACK_TREE: CompositionTree = {
  root: {
    children: [
      {
        id: "home-premium-g4-runtime-fallback",
        type: "vmx.home.premium-g4",
        version: HOME_PREMIUM_G4_CONTRACT_VERSION,
        config: homePremiumG4DefaultConfig(),
      },
    ],
  },
};
