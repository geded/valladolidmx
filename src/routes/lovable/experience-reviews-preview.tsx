/**
 * H-03 · Ola I2.c — Demo funcional de `vmx.experience.reviews`.
 *
 * Ruta interna noindex/nofollow. Ejercita variantes, capabilities,
 * fuentes mixtas (Google + TripAdvisor + propias), agregado
 * multi-plataforma, respuestas del negocio y JSON-LD.
 *
 * Valida la Directiva Founder (I2.c):
 *  - No es una lista de reseñas, es un bloque de confianza y prueba social.
 *  - Múltiples fuentes conviven sin acoplarse a una sola plataforma.
 *  - Preparado para evolución (Alux, idiomas, moderación) sin duplicarse.
 */
import { createFileRoute } from "@tanstack/react-router";
import { ExperienceReviews } from "@/components/experience-builder/blocks/experience-reviews/ExperienceReviews";
import { ExperienceReviewsBlock } from "@/components/experience-builder/blocks/experience-reviews/ExperienceReviewsBlock";
import { ExperiencePromotionsBlock } from "@/components/experience-builder/blocks/experience-promotions/ExperiencePromotionsBlock";
import { ExperienceProductsBlock } from "@/components/experience-builder/blocks/experience-products/ExperienceProductsBlock";
import {
  buildExperienceReviewsPreviewDTO,
  type ExperienceReviewsDTO,
} from "@/lib/experience-builder/blocks/experience-reviews/contract";
import { BusinessSurfaceProvider } from "@/components/surfaces/BusinessSurface";
import type { MarketplaceBusinessDetail } from "@/lib/marketplace/marketplace-reads.functions";

export const Route = createFileRoute("/lovable/experience-reviews-preview")({
  head: () => ({
    meta: [
      { title: "H-03 · I2.c — Experience Reviews" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: Page,
});

const MOCK_BUSINESS: MarketplaceBusinessDetail = {
  id: "demo-biz",
  slug: "hacienda-selva-maya",
  display_name: "Hacienda Selva Maya",
  tagline: "Refugio boutique con cenote privado.",
  destination_slug: "valladolid",
  category_slug: "hotel",
  verified: true,
  description: "",
  plan_tier: "premium",
  products: [],
  promotions: [],
};

function withVariant(v: ExperienceReviewsDTO["variant"]): ExperienceReviewsDTO {
  return { ...buildExperienceReviewsPreviewDTO(), variant: v };
}

function Page() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-14 px-4 py-10">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          H-03 · Ola I2.c · Trust & Social Proof
        </p>
        <h1 className="text-3xl font-semibold">vmx.experience.reviews</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Bloque oficial de confianza y prueba social. Soporta múltiples
          fuentes (Google, TripAdvisor, propias, Alux, futuras),
          reputación agregada, respuestas del negocio, moderación
          consciente y JSON-LD `AggregateRating` para SEO. Preparado
          para evolución (Alux, idiomas, tipo de viajero) sin
          duplicarse.
        </p>
      </header>

      <Case title="Variante list · con agregado + fuentes mixtas (default)">
        <ExperienceReviews dto={withVariant("list")} />
      </Case>
      <Case title="Variante summary · sólo tarjeta de reputación">
        <ExperienceReviews dto={withVariant("summary")} />
      </Case>
      <Case title="Variante grid">
        <ExperienceReviews dto={withVariant("grid")} />
      </Case>
      <Case title="Variante carousel">
        <ExperienceReviews dto={withVariant("carousel")} />
      </Case>
      <Case title="Variante featured (una destacada + secundarias)">
        <ExperienceReviews dto={withVariant("featured")} />
      </Case>
      <Case title="Variante wall (masonry densa)">
        <ExperienceReviews dto={withVariant("wall")} />
      </Case>
      <Case title="Variante compact (widget lateral)">
        <ExperienceReviews dto={withVariant("compact")} />
      </Case>

      <Case title="source: 'business' · empresa sin reseñas todavía (estado vacío educado)">
        <BusinessSurfaceProvider business={MOCK_BUSINESS}>
          <ExperienceReviewsBlock
            config={{
              source: "business",
              variant: "list",
              heading: "Opiniones de viajeros",
              emptyMessage:
                "Aún no hay reseñas publicadas de esta empresa. Sé la primera persona en compartir tu experiencia.",
            }}
          />
        </BusinessSurfaceProvider>
      </Case>

      <Case title="Commerce + Trust · Products + Promotions + Reviews sin acoplarse">
        <BusinessSurfaceProvider business={MOCK_BUSINESS}>
          <div className="flex flex-col gap-6">
            <ExperienceProductsBlock
              config={{ source: "business", variant: "grid", heading: "Catálogo" }}
            />
            <ExperiencePromotionsBlock
              config={{ source: "business", variant: "strip", heading: "Oportunidades" }}
            />
            <ExperienceReviewsBlock
              config={{
                source: "manual",
                variant: "featured",
                heading: "Confianza y prueba social",
                items: buildExperienceReviewsPreviewDTO().items,
              }}
            />
          </div>
        </BusinessSurfaceProvider>
      </Case>
    </main>
  );
}

function Case({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-t border-border pt-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {title}
      </p>
      {children}
    </section>
  );
}