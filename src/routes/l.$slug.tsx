/**
 * /l/$slug — Landing pública del Experience Builder.
 *
 * URL canónica declarada en `page-kind-registry` para los kinds
 * `landing`, `campaign`, `micrositio` y `promotion`. Reescrita sobre v1
 * (`page_compositions`) en Iniciativa 3 · Fase 3.3a.1 — v2 (`eb_pages`)
 * queda retirada como fuente de resolución pública.
 *
 * - SSR vía `getPublishedCompositionBySlug` (server fn pública v1).
 * - Render con el MISMO `CompositionRenderer` del Studio, Preview y `/p/$slug`.
 * - SEO derivado de `snapshot.chrome.seo` (title, description, canonical,
 *   og_image, noindex).
 */

import { createFileRoute, notFound, useParams } from "@tanstack/react-router";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { getPublishedCompositionBySlug } from "@/lib/experience-builder/public-reads.functions";
import { CompositionRenderer } from "@/lib/experience-builder/composition-renderer";
import { buildPublicHead, webPageJsonLd } from "@/lib/discovery/seo";
import { SITE } from "@/config/site";
import { PublicShell } from "@/components/discovery";

function landingQuery(slug: string) {
  return queryOptions({
    queryKey: ["eb", "published-landing", slug],
    queryFn: () => getPublishedCompositionBySlug({ data: { slug } }),
    staleTime: 60_000,
  });
}

export const Route = createFileRoute("/l/$slug")({
  loader: async ({ params, context }) => {
    const page = await context.queryClient.ensureQueryData(landingQuery(params.slug));
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
    const seo = (page.snapshot?.chrome?.seo ?? {}) as {
      title?: string;
      description?: string;
      og_image?: string;
      canonical?: string;
      noindex?: boolean;
    };
    const title = seo.title?.trim() || page.title || SITE.name;
    const description =
      seo.description?.trim() || page.description || SITE.default_description;
    const path = seo.canonical?.trim() || `/l/${params.slug}`;
    const ogImage = seo.og_image?.trim() || undefined;
    return buildPublicHead({
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
  const { data: page } = useQuery(landingQuery(slug));
  if (!page?.snapshot) return null;
  return (
    <PublicShell variant="minimal" className="min-h-screen">
      <div data-eb-page={page.id}>
        <CompositionRenderer tree={page.snapshot} pageType={page.page_type} />
      </div>
    </PublicShell>
  );
}