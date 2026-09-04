/**
 * Preview interna (noindex) de la FICHA CANÓNICA de Experiencia.
 *
 * Autoridad de render: `ExperiencePremiumSurface` (la misma superficie que
 * usa la ruta canónica `/producto/{slug}` para la familia experiencia/tour).
 * Con `?slug=` carga el producto real publicado; sin él muestra un caso
 * DEMO rotulado, jamás confundible con datos productivos.
 */
import { createFileRoute } from "@tanstack/react-router";

import { PublicShell } from "@/components/discovery";
import { ExperiencePremiumSurface } from "@/components/experience-premium/ExperiencePremiumSurface";
import { buildExperienceVMFromProduct } from "@/components/experience-premium/experience-premium-vm";
import {
  buildExperienceDemoVM,
  listExperienceDemoSlugs,
} from "@/lib/experiences/experience-demo-dataset";
import { TourismAluxPanel } from "@/components/alux/TourismAluxPanel";
import { getMarketplaceProductBySlug } from "@/lib/catalog/marketplace-reads.functions";

export const Route = createFileRoute("/lovable/g4-experience-premium-preview")({
  validateSearch: (search: Record<string, unknown>): { slug?: string; demo?: string } => ({
    ...(typeof search.slug === "string" && search.slug ? { slug: search.slug } : {}),
    ...(typeof search.demo === "string" && search.demo ? { demo: search.demo } : {}),
  }),
  loaderDeps: ({ search }) => ({ slug: search.slug ?? null, demo: search.demo ?? null }),
  head: () => ({
    meta: [
      { title: "Experiencia · Revisión visual de la ficha canónica" },
      {
        name: "description",
        content: "Vista previa interna de la ficha premium de Experiencia. No indexable.",
      },
      { name: "robots", content: "noindex,nofollow,noarchive" },
    ],
  }),
  loader: async ({ deps }) => {
    const fallbackDemo = () =>
      buildExperienceDemoVM(deps.demo ?? listExperienceDemoSlugs()[0]!) ??
      buildExperienceDemoVM(listExperienceDemoSlugs()[0]!)!;
    if (!deps.slug) return { vm: fallbackDemo() };
    const product = await getMarketplaceProductBySlug({ data: { slug: deps.slug } }).catch(
      () => null,
    );
    if (!product) return { vm: fallbackDemo() };
    return {
      vm: {
        ...buildExperienceVMFromProduct(product),
        demoNotice: "Superficie de revisión interna · datos reales, no indexable.",
      },
    };
  },
  component: ExperiencePremiumPreview,
});

function ExperiencePremiumPreview() {
  const { vm } = Route.useLoaderData();
  return (
    <PublicShell variant="default" compactCrumbsOnMobile>
      <ExperiencePremiumSurface
        vm={vm}
        aluxSlot={
          <TourismAluxPanel
            title="¿Esta experiencia encaja en tu viaje?"
            description="Alux la compara con tu contexto y la guarda en Mi Viaje."
            task={`Ayúdame a decidir si la experiencia "${vm.name}" encaja en mi viaje por el Oriente Maya.`}
            prompts={["Con niños", "Medio día", "Cerca del centro", "Naturaleza"]}
          />
        }
      />
    </PublicShell>
  );
}
