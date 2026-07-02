/**
 * `/p/$slug` — vista pública de cualquier composición publicada desde
 * el Experience Builder por su slug (landings personalizadas, páginas de
 * campañas, micrositios, etc.). Reutiliza el mismo `CompositionRenderer`
 * y el `PublicShell` para paridad 1:1 con la Home.
 */
import { createFileRoute, notFound, useParams } from "@tanstack/react-router";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { getPublishedCompositionBySlug } from "@/lib/experience-builder/public-reads.functions";
import { CompositionRenderer } from "@/lib/experience-builder/composition-renderer";
import { PublicShell } from "@/components/discovery";
import { buildPublicHead } from "@/lib/discovery/seo";
import { SITE } from "@/config/site";

function pageQuery(slug: string) {
  return queryOptions({
    queryKey: ["eb", "published-by-slug", slug],
    queryFn: () => getPublishedCompositionBySlug({ data: { slug } }),
    staleTime: 60_000,
  });
}

export const Route = createFileRoute("/p/$slug")({
  loader: async ({ params, context }) => {
    const page = await context.queryClient.ensureQueryData(pageQuery(params.slug));
    if (!page) throw notFound();
    return { page };
  },
  head: (ctx) => {
    const loaderData = ctx.loaderData as { page?: { title: string; description: string | null; snapshot?: { chrome?: { seo?: Record<string, unknown> } } } } | undefined;
    const page = loaderData?.page;
    const seo = (page?.snapshot?.chrome?.seo ?? {}) as {
      title?: string;
      description?: string;
      og_image?: string;
      canonical?: string;
      noindex?: boolean;
    };
    return buildPublicHead({
      title: seo.title?.trim() || page?.title || `${SITE.name}`,
      description: seo.description?.trim() || page?.description || SITE.default_description,
      path: seo.canonical?.trim() || `/p/${ctx.params.slug}`,
      ogType: "website",
      ogImage: seo.og_image?.trim() || undefined,
      noindex: Boolean(seo.noindex),
    });
  },
  notFoundComponent: NotFoundPage,
  component: PublicCompositionPage,
});

function NotFoundPage() {
  return (
    <main className="mx-auto max-w-xl px-6 py-16 text-center">
      <h1 className="text-2xl font-semibold">Página no publicada</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Esta página todavía no ha sido publicada desde el Experience Builder.
      </p>
    </main>
  );
}

function PublicCompositionPage() {
  const { slug } = useParams({ from: "/p/$slug" });
  const { data: page } = useQuery(pageQuery(slug));
  if (!page?.snapshot) return null;
  return (
    <PublicShell>
      <CompositionRenderer tree={page.snapshot} pageType={page.page_type} />
    </PublicShell>
  );
}