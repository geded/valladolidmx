/**
 * Sub-ola 2.5b · Product Shim regression harness.
 *
 * Renderiza cada bloque `vmx.product.*` en dos versiones:
 *   - LEGACY  → `product-blocks.legacy.tsx` (snapshot pre-migración).
 *   - SHIM    → `product-blocks.tsx` (delega al Surface Kit).
 *
 * Ambos se envuelven en `ProductSurfaceProvider` con el mismo fixture.
 * Los bloques sin enriquecimientos se comparan byte a byte; Reviews conserva
 * el contenido legacy y valida además el resumen agregado de Trust Engine.
 *
 * Uso:  bunx --bun tsx scripts/product-shim-regression.tsx
 * (o) bun run scripts/product-shim-regression.tsx
 *
 * No requiere red, base de datos ni router — los shims aceptan children
 * simples y `ProductActions`/`FavoriteButton` se stubean por queryClient
 * en Suspense; para evitar dependencias runtime, los bloques con slots
 * (Hero, PriceCta) se comparan sin ejecutar sus botones internos
 * (solamente marcados en el reporte).
 */
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { MarketplaceProductDetail } from "@/lib/marketplace/marketplace-reads.functions";
import { AuthProvider } from "@/hooks/useAuth";
import { ProductSurfaceProvider } from "@/components/surfaces/ProductSurface";

import * as Legacy from "../src/components/surfaces/product-blocks.legacy";
import * as Shim from "../src/components/surfaces/product-blocks";

const FIXTURE: MarketplaceProductDetail = {
  id: "prod-1",
  slug: "tour-cenote",
  name: "Tour Cenote Sagrado",
  tagline: "Aventura de medio día",
  description: "Descripción larga\ncon saltos de línea.",
  product_type: "experience",
  price_amount: 1200,
  price_currency: "MXN",
  status: "published",
  conversion_mode: "solicitud_reserva",
  primary_action_label: "Reservar",
  secondary_action_mode: "contact",
  secondary_action_label: "Consultar",
  accepts_online_payment: true,
  requires_availability: true,
  visibility_level: "public",
  cover_url: "https://cdn/x/cover.jpg",
  media: [
    { id: "m1", role: "cover", url: "https://cdn/x/cover.jpg", alt: "Portada" },
    { id: "m2", role: "gallery", url: "https://cdn/x/g1.jpg", alt: null },
    { id: "m3", role: "gallery", url: "https://cdn/x/g2.jpg", alt: "Vista" },
  ] as MarketplaceProductDetail["media"],
  business: {
    id: "b1",
    slug: "hotel-x",
    display_name: "Hotel X",
    tagline: "Boutique en Valladolid",
    verified: true,
    primary_contact: { type: "whatsapp", value: "+52...", label: "Recepción" },
    primary_location: {
      label: "Sede principal",
      address_line1: "Calle 40 #123",
      address_line2: "Centro",
    },
  } as MarketplaceProductDetail["business"],
  related: [
    {
      id: "r1",
      slug: "tour-2",
      name: "Tour Chichén",
      tagline: "Día completo",
      product_type: "experience",
      price_amount: 2500,
      price_currency: "MXN",
      business_slug: "hotel-x",
      business_name: "Hotel X",
      conversion_mode: "solicitud_reserva",
      primary_action_label: null,
      secondary_action_mode: null,
      secondary_action_label: null,
      accepts_online_payment: false,
      requires_availability: true,
      visibility_level: "public",
    },
  ],
  promotions: [
    {
      id: "p1",
      slug: "verano",
      title: "Verano",
      description: "20% off",
      discount_percent: 20,
      starts_at: null,
      ends_at: null,
      business_slug: "hotel-x",
      business_name: "Hotel X",
    },
  ],
  reviews: [
    {
      id: "rv1",
      author_display_name: "Ana",
      rating: 5,
      title: "Excelente",
      body: "Muy bueno",
    } as MarketplaceProductDetail["reviews"][number],
  ],
  review_stats: {
    count: 1,
    average: 5,
    verifiedCount: 1,
    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 1 },
  },
  faqs: [{ id: "f1", question: "¿Incluye?", answer: "Todo" }],
};

const QUERY_CLIENT = new QueryClient();

function render(node: React.ReactElement): string {
  return renderToStaticMarkup(
    <QueryClientProvider client={QUERY_CLIENT}>
      <AuthProvider>
        <ProductSurfaceProvider product={FIXTURE}>{node}</ProductSurfaceProvider>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

/**
 * Bloques que renderean sin slots externos.
 * Se excluyen Shell (requiere router para PublicShell), Hero y PriceCta
 * (contienen componentes con hooks de Query/Router; se comparan en
 * inspección visual manual desde `/producto/$slug`).
 */
const CASES: Array<{
  id: string;
  legacy: () => React.ReactElement;
  shim: () => React.ReactElement;
  compatible?: (legacyHtml: string, shimHtml: string) => boolean;
}> = [
  {
    id: "vmx.product.gallery",
    legacy: () => <Legacy.ProductGalleryBlock />,
    shim: () => <Shim.ProductGalleryBlock />,
  },
  {
    id: "vmx.product.description",
    legacy: () => <Legacy.ProductDescriptionBlock />,
    shim: () => <Shim.ProductDescriptionBlock />,
  },
  {
    id: "vmx.product.promos",
    legacy: () => <Legacy.ProductPromosBlock />,
    shim: () => <Shim.ProductPromosBlock />,
  },
  {
    id: "vmx.product.reviews",
    legacy: () => <Legacy.ProductReviewsBlock />,
    shim: () => <Shim.ProductReviewsBlock />,
    compatible: (_legacyHtml, shimHtml) =>
      ["Opiniones", "Ana", "5 de 5", "Excelente", "Muy bueno", "1 opinión · 1 verificada"].every(
        (token) => shimHtml.includes(token),
      ),
  },
  {
    id: "vmx.product.faq",
    legacy: () => <Legacy.ProductFaqBlock />,
    shim: () => <Shim.ProductFaqBlock />,
  },
];

let ok = 0;
let diff = 0;
for (const c of CASES) {
  const a = render(c.legacy());
  const b = render(c.shim());
  if (c.compatible ? c.compatible(a, b) : a === b) {
    ok++;
    console.log(`OK    ${c.id}`);
  } else {
    diff++;
    console.log(`DIFF  ${c.id}`);
    console.log("  --- legacy");
    console.log("  " + a);
    console.log("  --- shim");
    console.log("  " + b);
  }
}
console.log(`\n${ok}/${CASES.length} bloques compatibles, ${diff} diferencias.`);
process.exit(diff === 0 ? 0 : 1);
