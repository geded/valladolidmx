import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { SITE } from "@/config/site";
import { getPublishedHomeComposition } from "@/lib/experience-builder/public-reads.functions";
import { CompositionRenderer } from "@/lib/experience-builder/composition-renderer";
import { PublicShell } from "@/components/discovery";
import { buildPublicHead } from "@/lib/discovery/seo";
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
  head: ({ loaderData }) => {
    const seo = (loaderData?.seo ?? {}) as {
      title?: string;
      description?: string;
      og_image?: string;
      canonical?: string;
      noindex?: boolean;
    };
    return buildPublicHead({
      title: seo.title?.trim() || `${SITE.name} — Despierta en Valladolid y descubre el Oriente Maya`,
      description: seo.description?.trim() || SITE.default_description,
      path: seo.canonical?.trim() || "/",
      ogType: "website",
      ogImage: seo.og_image?.trim() || undefined,
      noindex: Boolean(seo.noindex),
    });
  },
  loader: async ({ context }) => {
    // Prefetch para SSR; nunca lanza — getPublishedHomeComposition cae a null
    // ante cualquier error, garantizando que la Home siempre cargue.
    const published = await context.queryClient.ensureQueryData(publishedHomeQuery);
    return { seo: published?.snapshot?.chrome?.seo ?? null };
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

  if (published?.snapshot) {
    return (
      <PublicShell variant="hero">
        <CompositionRenderer tree={published.snapshot} pageType="home" />
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
  "rutas",
  "consejo-alux",
  "arma-tu-viaje",
  "en-vivo",
  "empresas",
  "resenas",
];

function LegacyHome() {
  return (
    <PublicShell variant="hero">
      {HOME_FALLBACK_SECTIONS.map((kind) => {
        const Section = getDiscoverySection(kind).component;
        return <Section key={kind} />;
      })}
    </PublicShell>
  );
}
