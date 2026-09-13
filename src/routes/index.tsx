import { createFileRoute } from "@tanstack/react-router";
import { queryOptions } from "@tanstack/react-query";
import { SITE } from "@/config/site";
import { getPublishedHomeComposition } from "@/lib/experience-builder/public-reads.functions";
import { HomePremiumRenderer } from "@/lib/experience-builder/home-premium-renderer";
import type { CompositionTree } from "@/lib/experience-builder/composition-tree";
import { PublicShell } from "@/components/discovery";
// Founder Decision (2026-09-13): la continuidad del viaje NO interrumpe
// la portada. El retorno se reconoce con un aviso breve en el botón
// flotante de Mi Viaje (`FloatingTravelPlanDock`), que se cierra solo.
import { useSectionEditWrap } from "@/components/experience-builder/SectionEditOverlay";
import { buildPublicHead, pickFirstMediaUrl, webPageJsonLd } from "@/lib/discovery/seo";
import {
  HOME_PREMIUM_FALLBACK_TREE,
  resolveHomePremiumAuthorityTree,
} from "@/components/home-premium/home-premium-config";
import { publishedDestinationsQueryOptions } from "@/lib/destinations/destination-labels";
import { homeFeaturedCategoriesQueryOptions } from "@/lib/cms/home-featured-categories-query";
import { resolveHomePremiumRealContent } from "@/lib/experience-builder/smart-blocks.functions";

// El contenido real de la Home (destinos, eventos, negocios acreditados) se
// resuelve en SSR con la MISMA clave que consume `HomePremiumRenderer`, para
// que el visitante no vea un segundo pintado al hidratar y los buscadores
// reciban la portada completa. La página de destino ya usa este patrón.
const homeRealContentQuery = queryOptions({
  queryKey: ["home-premium-real-content"],
  queryFn: () => resolveHomePremiumRealContent(),
  staleTime: 60_000,
});

const publishedHomeQuery = queryOptions({
  queryKey: ["eb", "published-home", "default"],
  queryFn: () => getPublishedHomeComposition({ data: { variant_key: "default" } }),
  staleTime: 60_000,
});

export const Route = createFileRoute("/")({
  head: (ctx) => {
    const loaderData = ctx.loaderData as
      | { seo?: Record<string, unknown> | null; fallbackImage?: string | null }
      | undefined;
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
    const authorityTree = resolveHomePremiumAuthorityTree(published?.snapshot);
    const stableAuthorityTree = authorityTree ?? HOME_PREMIUM_FALLBACK_TREE;
    const premiumNode = stableAuthorityTree.root.children[0];
    return {
      authorityTree: stableAuthorityTree,
      seo: stableAuthorityTree.chrome?.seo ?? null,
      fallbackImage:
        !premiumNode?.hidden ? (pickFirstMediaUrl(stableAuthorityTree) ?? null) : null,
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
  const { authorityTree } = Route.useLoaderData() as { authorityTree: CompositionTree };
  const editWrap = useSectionEditWrap({ pageSlug: "home" });

  return (
    <PublicShell variant="hero">
      <HomePremiumRenderer tree={authorityTree} wrap={editWrap} />
    </PublicShell>
  );
}
