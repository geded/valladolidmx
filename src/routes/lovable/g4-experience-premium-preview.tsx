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
import {
  buildExperienceVMFromProduct,
  type ExperiencePremiumVM,
} from "@/components/experience-premium/experience-premium-vm";
import { TourismAluxPanel } from "@/components/alux/TourismAluxPanel";
import { getMarketplaceProductBySlug } from "@/lib/catalog/marketplace-reads.functions";
import { resolveExperienceCommerce } from "@/lib/experiences/experience-commerce";

const DEMO_VM: ExperiencePremiumVM = {
  id: "demo-experiencia",
  slug: "demo-experiencia",
  name: "Inframundo Maya",
  eyebrow: "Experiencia guiada",
  tagline:
    "Un descenso documental a los cenotes que los mayas leyeron como puerta del Xibalbá, con guías del Oriente Maya.",
  description:
    "Caso DEMO de revisión visual. Ninguno de estos datos es información comercial real: sirven únicamente para validar composición, jerarquía y responsive de la ficha canónica de Experiencia.",
  operatorName: "Operador demostrativo",
  operatorHref: null,
  destinationSlug: "valladolid",
  destinationLabel: "Valladolid",
  cover: {
    url: "/api/public/studio-media/governed/v1p1c/experience-cover.jpg",
    alt: "Cenote abierto de aguas turquesa en una caverna de piedra caliza cerca de Valladolid, Yucatán",
  },
  gallery: [
    {
      url: "/api/public/studio-media/governed/v1p1c/experience-gallery-1.jpg",
      alt: "Interior de caverna de piedra caliza con estalactitas y haz de luz natural sobre el agua",
    },
    {
      url: "/api/public/studio-media/governed/v1p1c/experience-gallery-2.jpg",
      alt: "Sendero de selva baja yucateca con vegetación densa y suelo de piedra caliza",
    },
  ],
  facts: [
    { label: "Tipo", value: "Experiencia guiada" },
    { label: "Destino", value: "Valladolid" },
  ],
  faqs: [],
  related: [],
  commerce: resolveExperienceCommerce({
    conversionMode: "informacion",
    acceptsOnlinePayment: false,
  }),
  demoNotice:
    "Datos de prueba · caso DEMO de revisión visual. Sin precios, disponibilidad ni comercio reales.",
};

export const Route = createFileRoute("/lovable/g4-experience-premium-preview")({
  validateSearch: (search: Record<string, unknown>): { slug?: string } =>
    typeof search.slug === "string" && search.slug ? { slug: search.slug } : {},
  loaderDeps: ({ search }) => ({ slug: search.slug ?? null }),
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
    if (!deps.slug) return { vm: DEMO_VM };
    const product = await getMarketplaceProductBySlug({ data: { slug: deps.slug } }).catch(
      () => null,
    );
    if (!product) return { vm: DEMO_VM };
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
