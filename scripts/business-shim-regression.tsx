/**
 * Sub-ola 2.5c · Business Shim regression harness.
 *
 * Renderiza cada bloque `vmx.business.*` en dos versiones:
 *   - LEGACY  → `business-blocks.legacy.tsx` (snapshot pre-migración).
 *   - SHIM    → `business-blocks.tsx` (delega/consume Surface Kit).
 *
 * Ambos se envuelven en `BusinessSurfaceProvider` con el mismo fixture y
 * se compara el HTML producido por `renderToStaticMarkup`. Reporta OK/DIFF
 * por bloque. Cero diferencias = criterio de aprobación cumplido.
 *
 * Uso:  bunx --bun tsx scripts/business-shim-regression.tsx
 *
 * Se excluyen los bloques cuyo render requiere router o queryClient
 * (Shell/PublicShell → router; HeaderBadges/Products/Promotions →
 * FavoriteButton/ProductActions con hooks de Query). Su equivalencia
 * visual se auditó manualmente en `/marketplace/$slug`.
 */
import { renderToStaticMarkup } from "react-dom/server";
import type { MarketplaceBusinessDetail } from "@/lib/marketplace/marketplace-reads.functions";
import { BusinessSurfaceProvider } from "@/components/surfaces/BusinessSurface";

import * as Legacy from "../src/components/surfaces/business-blocks.legacy";
import * as Shim from "../src/components/surfaces/business-blocks";

const FIXTURE: MarketplaceBusinessDetail = {
  id: "b1",
  slug: "hotel-x",
  display_name: "Hotel X",
  tagline: "Boutique en Valladolid",
  description: "Descripción larga\ncon saltos de línea.",
  category_slug: "hotel",
  destination_slug: "valladolid",
  verified: true,
  plan_tier: "premium",
  products: [],
  promotions: [],
  primary_contact: null,
  primary_location: null,
} as unknown as MarketplaceBusinessDetail;

function render(node: React.ReactElement): string {
  return renderToStaticMarkup(
    <BusinessSurfaceProvider business={FIXTURE}>{node}</BusinessSurfaceProvider>,
  );
}

const CASES: Array<{
  id: string;
  legacy: () => React.ReactElement;
  shim: () => React.ReactElement;
}> = [
  {
    id: "vmx.business.description",
    legacy: () => <Legacy.BusinessDescriptionBlock />,
    shim: () => <Shim.BusinessDescriptionBlock />,
  },
  {
    id: "vmx.business.gallery",
    legacy: () => <Legacy.BusinessGalleryBlock />,
    shim: () => <Shim.BusinessGalleryBlock />,
  },
  {
    id: "vmx.business.info",
    legacy: () => <Legacy.BusinessInfoBlock />,
    shim: () => <Shim.BusinessInfoBlock />,
  },
  {
    id: "vmx.business.contact",
    legacy: () => <Legacy.BusinessContactBlock />,
    shim: () => <Shim.BusinessContactBlock />,
  },
];

let ok = 0;
let diff = 0;
for (const c of CASES) {
  const a = render(c.legacy());
  const b = render(c.shim());
  if (a === b) {
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
console.log(`\n${ok}/${CASES.length} bloques idénticos, ${diff} diferencias.`);
process.exit(diff === 0 ? 0 : 1);