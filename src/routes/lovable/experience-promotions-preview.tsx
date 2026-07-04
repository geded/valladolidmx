/**
 * H-03 · Ola I2.b — Demo funcional de `vmx.experience.promotions`.
 *
 * Ruta interna noindex/nofollow. Ejercita variantes, capabilities,
 * urgencia y fuente `business` (hidratada desde `BusinessSurfaceContext`).
 * Valida la Directiva Commerce: Products y Promotions conviven
 * en la misma superficie sin depender uno del otro.
 */
import { createFileRoute } from "@tanstack/react-router";
import { ExperiencePromotions } from "@/components/experience-builder/blocks/experience-promotions/ExperiencePromotions";
import { ExperiencePromotionsBlock } from "@/components/experience-builder/blocks/experience-promotions/ExperiencePromotionsBlock";
import { ExperienceProductsBlock } from "@/components/experience-builder/blocks/experience-products/ExperienceProductsBlock";
import {
  buildExperiencePromotionsPreviewDTO,
  type ExperiencePromotionsDTO,
} from "@/lib/experience-builder/blocks/experience-promotions/contract";
import { BusinessSurfaceProvider } from "@/components/surfaces/BusinessSurface";
import type { MarketplaceBusinessDetail } from "@/lib/catalog/marketplace-reads.functions";

export const Route = createFileRoute("/lovable/experience-promotions-preview")({
  head: () => ({
    meta: [
      { title: "H-03 · I2.b — Experience Promotions" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: Page,
});

const in2days = () => new Date(Date.now() + 2 * 864e5).toISOString();
const in12days = () => new Date(Date.now() + 12 * 864e5).toISOString();
const in30days = () => new Date(Date.now() + 30 * 864e5).toISOString();

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
  promotions: [
    {
      id: "pr1",
      slug: "2x1-suite",
      title: "2 noches por 1 en Suite Cenote",
      description: "Aplica entre semana. Sujeto a disponibilidad.",
      discount_percent: 50,
      starts_at: null,
      ends_at: in2days(),
      business_slug: "hacienda-selva-maya",
      business_name: "Hacienda Selva Maya",
    },
    {
      id: "pr2",
      slug: "cena-20",
      title: "−20% en cena de degustación",
      description: "Menú de 7 tiempos con maridaje de mezcales.",
      discount_percent: 20,
      starts_at: null,
      ends_at: in12days(),
      business_slug: "hacienda-selva-maya",
      business_name: "Hacienda Selva Maya",
    },
    {
      id: "pr3",
      slug: "tour-early-bird",
      title: "Tour cenotes: reserva anticipada",
      description: "Ahorra 15% si reservas con 30 días de anticipación.",
      discount_percent: 15,
      starts_at: null,
      ends_at: in30days(),
      business_slug: "hacienda-selva-maya",
      business_name: "Hacienda Selva Maya",
    },
  ],
};

function withVariant(v: ExperiencePromotionsDTO["variant"]): ExperiencePromotionsDTO {
  return { ...buildExperiencePromotionsPreviewDTO(), variant: v };
}

function Page() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-14 px-4 py-10">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          H-03 · Ola I2.b · Commerce
        </p>
        <h1 className="text-3xl font-semibold">vmx.experience.promotions</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Bloque oficial de oportunidades comerciales. Convive con
          `vmx.experience.products` sin acoplarse — ambos son piezas
          independientes de la capa Commerce. Contrato preparado para
          Alux, Discovery Navigator, Context Engine y campañas.
        </p>
      </header>

      <Case title="Variante grid (preview DTO)">
        <ExperiencePromotions dto={withVariant("grid")} />
      </Case>
      <Case title="Variante strip (mobile-first)">
        <ExperiencePromotions dto={withVariant("strip")} />
      </Case>
      <Case title="Variante list">
        <ExperiencePromotions dto={withVariant("list")} />
      </Case>
      <Case title="Variante carousel">
        <ExperiencePromotions dto={withVariant("carousel")} />
      </Case>
      <Case title="Variante featured">
        <ExperiencePromotions dto={withVariant("featured")} />
      </Case>
      <Case title="Variante banner (una única oportunidad)">
        <ExperiencePromotions dto={withVariant("banner")} />
      </Case>

      <Case title="source: 'business' · agrupado por urgencia">
        <BusinessSurfaceProvider business={MOCK_BUSINESS}>
          <ExperiencePromotionsBlock
            config={{
              source: "business",
              variant: "grid",
              heading: "Promociones vigentes",
              groupBy: "urgency",
            }}
          />
        </BusinessSurfaceProvider>
      </Case>

      <Case title="Directiva Commerce · Products + Promotions conviven sin acoplarse">
        <BusinessSurfaceProvider business={{ ...MOCK_BUSINESS, products: [] }}>
          <div className="flex flex-col gap-6">
            <ExperienceProductsBlock
              config={{ source: "business", variant: "grid", heading: "Catálogo" }}
            />
            <ExperiencePromotionsBlock
              config={{ source: "business", variant: "strip", heading: "Oportunidades" }}
            />
          </div>
        </BusinessSurfaceProvider>
      </Case>

      <Case title="Estado vacío (source manual sin items)">
        <ExperiencePromotionsBlock
          config={{
            source: "manual",
            heading: "Ofertas",
            emptyMessage: "Sin ofertas activas por ahora.",
            items: [],
          }}
        />
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