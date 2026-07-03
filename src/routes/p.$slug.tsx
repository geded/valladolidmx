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
import { buildPublicHead, findFirstSmartBlockNode, pickFirstMediaUrl, webPageJsonLd } from "@/lib/discovery/seo";
import { SITE } from "@/config/site";
import { resolveSmartBlock } from "@/lib/experience-builder/smart-blocks.functions";
import { getBlock } from "@/lib/experience-builder/block-registry";
import type { SmartBlockQuery } from "@/lib/experience-builder/block-contract";

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
    const staticImage = page.snapshot ? pickFirstMediaUrl(page.snapshot) : undefined;
    const smartImage = staticImage ? undefined : await resolveFirstSmartBlockImage(page.snapshot);
    return { page, ogImageFallback: staticImage ?? smartImage };
  },
  head: (ctx) => {
    const loaderData = ctx.loaderData as
      | { page?: { title: string; description: string | null; snapshot?: { chrome?: { seo?: Record<string, unknown> } } }; ogImageFallback?: string }
      | undefined;
    const page = loaderData?.page;
    const seo = (page?.snapshot?.chrome?.seo ?? {}) as {
      title?: string;
      description?: string;
      og_image?: string;
      canonical?: string;
      noindex?: boolean;
    };
    const title = seo.title?.trim() || page?.title || `${SITE.name}`;
    const description = seo.description?.trim() || page?.description || SITE.default_description;
    const path = seo.canonical?.trim() || `/p/${ctx.params.slug}`;
    const ogImage = seo.og_image?.trim() || loaderData?.ogImageFallback || undefined;
    return buildPublicHead({
      title,
      description,
      path,
      ogType: "website",
      ogImage,
      noindex: Boolean(seo.noindex),
      jsonLd: seo.noindex ? undefined : [webPageJsonLd({ title, description, path, image: ogImage })],
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

const SMART_IMAGE_KEYS = ["hero_image_url", "cover_image_url", "logo_url"] as const;

/**
 * Resuelve el primer Smart Block del árbol y devuelve la primera URL de
 * imagen encontrada en sus resultados. Falla cerrada: cualquier error o
 * ausencia devuelve `undefined` para no romper el SSR/SEO.
 */
async function resolveFirstSmartBlockImage(tree: unknown): Promise<string | undefined> {
  try {
    const node = findFirstSmartBlockNode(tree);
    if (!node) return undefined;
    const contract = getBlock(node.type);
    const baseQuery = contract?.data_sources?.[0]?.query as SmartBlockQuery | undefined;
    if (!baseQuery) return undefined;
    const cfg = node.config ?? {};
    const limit = typeof cfg.limit === "number" && cfg.limit > 0 ? Math.min(6, Math.floor(cfg.limit)) : 3;
    const query: SmartBlockQuery = { ...baseQuery, limit };
    const res = await resolveSmartBlock({ data: { query } });
    for (const item of res.items ?? []) {
      for (const key of SMART_IMAGE_KEYS) {
        const v = (item as Record<string, unknown>)[key];
        if (typeof v === "string" && v.trim()) return v;
      }
    }
    return undefined;
  } catch {
    return undefined;
  }
}