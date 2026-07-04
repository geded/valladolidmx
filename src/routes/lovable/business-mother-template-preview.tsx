/**
 * H-03 · Ola I1.d — Preview de la Plantilla Madre Business migrada
 * a bloques oficiales (Hero + Subnav + Section + Info-Grid + CTA-Bar).
 *
 * Muestra tres estados representativos usando datos mock que respetan
 * el contrato `MarketplaceBusinessDetail`.
 */
import { createFileRoute } from "@tanstack/react-router";
import {
  BusinessSurface,
  BusinessSurfaceProvider,
} from "@/components/surfaces/BusinessSurface";
import type { MarketplaceBusinessDetail } from "@/lib/marketplace/marketplace-reads.functions";

const MOCK_HOTEL: MarketplaceBusinessDetail = {
  id: "demo-hotel",
  slug: "hacienda-selva-maya",
  display_name: "Hacienda Selva Maya",
  tagline: "Refugio boutique con cenote privado en el corazón de Valladolid.",
  destination_slug: "valladolid",
  category_slug: "hotel",
  verified: true,
  description:
    "Cinco siglos de historia yucateca en una hacienda restaurada, con jardín botánico, gastronomía maya de autor y experiencias curadas para viajeros conscientes.",
  plan_tier: "premium",
  products: [
    {
      id: "p1",
      slug: "habitacion-cenote",
      name: "Habitación Cenote",
      tagline: "Suite con vista al cenote privado, desayuno incluido.",
      product_type: "room",
      price_amount: 4200,
      price_currency: "MXN",
      business_slug: "hacienda-selva-maya",
      business_name: "Hacienda Selva Maya",
      conversion_mode: "external",
      primary_action_label: "Reservar",
      secondary_action_mode: "contact",
      secondary_action_label: "Contactar",
      accepts_online_payment: false,
      requires_availability: false,
      visibility_level: "public",
    },
    {
      id: "p2",
      slug: "cena-degustacion",
      name: "Cena de degustación",
      tagline: "Menú de siete tiempos con maridaje de mezcales artesanales.",
      product_type: "experience",
      price_amount: 1800,
      price_currency: "MXN",
      business_slug: "hacienda-selva-maya",
      business_name: "Hacienda Selva Maya",
      conversion_mode: "internal",
      primary_action_label: "Reservar",
      secondary_action_mode: "contact",
      secondary_action_label: "Contactar",
      accepts_online_payment: false,
      requires_availability: true,
      visibility_level: "public",
    },
  ],
  promotions: [
    {
      id: "promo1",
      slug: "verano-2026",
      title: "Verano Maya 2026",
      description: "3x2 en noches del 15 de junio al 30 de agosto.",
      discount_percent: 33,
      starts_at: null,
      ends_at: null,
      business_slug: "hacienda-selva-maya",
      business_name: "Hacienda Selva Maya",
    },
  ],
};

const MOCK_MINIMAL: MarketplaceBusinessDetail = {
  id: "demo-min",
  slug: "cafeteria-central",
  display_name: "Cafetería Central",
  tagline: "Café de especialidad frente al parque principal.",
  destination_slug: "valladolid",
  category_slug: "cafeteria",
  verified: false,
  description: "",
  plan_tier: "free",
  products: [],
  promotions: [],
};

export const Route = createFileRoute("/lovable/business-mother-template-preview")({
  head: () => ({
    meta: [{ title: "H-03 · I1.d Preview — Plantilla Madre Business" }],
  }),
  component: PreviewPage,
});

function PreviewPage() {
  return (
    <div className="space-y-16 py-8">
      <PreviewFrame title="Caso 1 · Hotel premium con productos y promociones">
        <BusinessSurfaceProvider business={MOCK_HOTEL}>
          <BusinessSurface />
        </BusinessSurfaceProvider>
      </PreviewFrame>

      <PreviewFrame title="Caso 2 · Ficha mínima (plan free, sin descripción ni productos)">
        <BusinessSurfaceProvider business={MOCK_MINIMAL}>
          <BusinessSurface />
        </BusinessSurfaceProvider>
      </PreviewFrame>

      <PreviewFrame title="Caso 3 · Sin negocio (fallback)">
        <BusinessSurfaceProvider business={null}>
          <BusinessSurface />
        </BusinessSurfaceProvider>
      </PreviewFrame>
    </div>
  );
}

function PreviewFrame({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-border pt-6">
      <p className="mx-auto max-w-6xl px-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {title}
      </p>
      <div className="mt-4">{children}</div>
    </section>
  );
}