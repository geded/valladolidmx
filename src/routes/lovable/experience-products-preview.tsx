/**
 * H-03 · Ola I2.a — Demo funcional de `vmx.experience.products`.
 *
 * Ruta interna noindex/nofollow. Ejercita variantes, capabilities y
 * fuente `business` (hidratada desde `BusinessSurfaceContext`) sin
 * depender de datos reales de la base.
 */
import { createFileRoute } from "@tanstack/react-router";
import { ExperienceProducts } from "@/components/experience-builder/blocks/experience-products/ExperienceProducts";
import { ExperienceProductsBlock } from "@/components/experience-builder/blocks/experience-products/ExperienceProductsBlock";
import {
  buildExperienceProductsPreviewDTO,
  type ExperienceProductsDTO,
} from "@/lib/experience-builder/blocks/experience-products/contract";
import { BusinessSurfaceProvider } from "@/components/surfaces/BusinessSurface";
import type { MarketplaceBusinessDetail } from "@/lib/marketplace/marketplace-reads.functions";

export const Route = createFileRoute("/lovable/experience-products-preview")({
  head: () => ({
    meta: [
      { title: "H-03 · I2.a — Experience Products" },
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
  products: [
    {
      id: "p1", slug: "hab-cenote", name: "Habitación Cenote",
      tagline: "Suite con vista al cenote privado, desayuno incluido.",
      product_type: "room", price_amount: 4200, price_currency: "MXN",
      business_slug: "hacienda-selva-maya", business_name: "Hacienda Selva Maya",
      conversion_mode: "reservar_en_linea",
      primary_action_label: null, secondary_action_mode: "whatsapp",
      secondary_action_label: null, accepts_online_payment: false,
      requires_availability: true, visibility_level: "public",
    },
    {
      id: "p2", slug: "cena", name: "Cena de degustación",
      tagline: "Menú de siete tiempos con maridaje de mezcales.",
      product_type: "experience", price_amount: 1800, price_currency: "MXN",
      business_slug: "hacienda-selva-maya", business_name: "Hacienda Selva Maya",
      conversion_mode: "solicitar_cotizacion",
      primary_action_label: null, secondary_action_mode: "whatsapp",
      secondary_action_label: null, accepts_online_payment: false,
      requires_availability: false, visibility_level: "public",
    },
    {
      id: "p3", slug: "tour", name: "Tour cenotes sagrados",
      tagline: "Ruta guiada de medio día por tres cenotes emblemáticos.",
      product_type: "tour", price_amount: 950, price_currency: "MXN",
      business_slug: "hacienda-selva-maya", business_name: "Hacienda Selva Maya",
      conversion_mode: "arma_tu_viaje",
      primary_action_label: null, secondary_action_mode: null,
      secondary_action_label: null, accepts_online_payment: false,
      requires_availability: false, visibility_level: "public",
    },
  ],
  promotions: [],
};

function withVariant(v: ExperienceProductsDTO["variant"]): ExperienceProductsDTO {
  return { ...buildExperienceProductsPreviewDTO(), variant: v };
}

function Page() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-14 px-4 py-10">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          H-03 · Ola I2.a · Commerce
        </p>
        <h1 className="text-3xl font-semibold">vmx.experience.products</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Bloque oficial de listado de productos. Reutilizable en business,
          destination, region, category, landing, micrositios y futuras
          Experience Pages. Contrato preparado para incorporar Alux,
          Discovery Navigator y Context Engine sin romper compatibilidad.
        </p>
      </header>

      <Case title="Variante grid (preview DTO)">
        <ExperienceProducts dto={withVariant("grid")} />
      </Case>
      <Case title="Variante list">
        <ExperienceProducts dto={withVariant("list")} />
      </Case>
      <Case title="Variante carousel">
        <ExperienceProducts dto={withVariant("carousel")} />
      </Case>
      <Case title="Variante featured">
        <ExperienceProducts dto={withVariant("featured")} />
      </Case>

      <Case title="source: 'business' (hidratado desde BusinessSurfaceContext)">
        <BusinessSurfaceProvider business={MOCK_BUSINESS}>
          <ExperienceProductsBlock
            config={{
              source: "business",
              variant: "grid",
              heading: "Habitaciones y experiencias",
              columns: 2,
            }}
          />
        </BusinessSurfaceProvider>
      </Case>

      <Case title="source: 'business' · agrupado por tipo · lista">
        <BusinessSurfaceProvider business={MOCK_BUSINESS}>
          <ExperienceProductsBlock
            config={{
              source: "business",
              variant: "list",
              heading: "Todo lo que ofrece",
              groupBy: "type",
            }}
          />
        </BusinessSurfaceProvider>
      </Case>

      <Case title="Estado vacío (source manual sin items)">
        <ExperienceProductsBlock
          config={{
            source: "manual",
            heading: "Catálogo",
            emptyMessage: "Todavía no publicamos productos aquí.",
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