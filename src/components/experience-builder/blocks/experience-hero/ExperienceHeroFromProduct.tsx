/**
 * U1.5 · Tourism Component Library Hardening — Unificación oficial.
 *
 * Adapter que reemplaza al legacy `ProductHeroBlock` y unifica el Hero de
 * la superficie de Producto bajo la ÚNICA familia oficial
 * `vmx.experience.hero` (Tourist Hero Policy).
 *
 * Reglas aplicadas:
 *  - No se crea un Hero paralelo: se mapea `MarketplaceProductDetail` al
 *    contrato `ExperienceHeroDTO` v1.1.0 y se delega al presentacional
 *    oficial `<ExperienceHero />`.
 *  - Las acciones interactivas específicas del producto
 *    (`FavoriteButton`, `AddToTravelPlanButton`) se inyectan por el slot
 *    oficial `extensionsSlot`, evitando duplicar comportamiento.
 *  - Sin regresión funcional respecto a la versión Sub-ola 2.5b: los
 *    mismos datos (`product_type`, `name`, `tagline`, favorito, agregar
 *    al viaje) se preservan.
 */
import { FavoriteButton } from "@/components/commerce/FavoriteButton";
import { AddToTravelPlanButton } from "@/components/traveler/AddToTravelPlanButton";
import { useProduct } from "@/components/surfaces/ProductSurface";
import { ExperienceHero } from "./ExperienceHero";
import type { ExperienceHeroDTO } from "@/lib/experience-builder/blocks/experience-hero/contract";
import { EmptyHint } from "@/components/surfaces/kit";

export function ExperienceHeroFromProduct() {
  const p = useProduct();
  if (!p) {
    return <EmptyHint>Hero del producto: tipo, título y tagline.</EmptyHint>;
  }

  const dto: ExperienceHeroDTO = {
    variant: "editorial",
    eyebrow: p.product_type || null,
    title: p.name,
    description: p.tagline || null,
    media: null,
    badges: [],
    meta: [],
    ctaPrimary: null,
    ctaSecondary: null,
  };

  return (
    <ExperienceHero
      dto={dto}
      headingLevel="h1"
      extensionsSlot={
        <div className="flex flex-wrap items-center gap-2">
          <FavoriteButton entityKind="product" entityId={p.id} />
          <AddToTravelPlanButton
            kind="product"
            targetId={p.id}
            title={p.name}
            slug={p.slug}
            subtitle={p.product_type}
          />
        </div>
      }
    />
  );
}