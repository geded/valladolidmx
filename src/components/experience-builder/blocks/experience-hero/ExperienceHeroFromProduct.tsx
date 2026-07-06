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
import { Share2 } from "lucide-react";

export function ExperienceHeroFromProduct() {
  const p = useProduct();
  if (!p) {
    return <EmptyHint>Hero del producto: tipo, título y tagline.</EmptyHint>;
  }

  const gallery = (p.media ?? [])
    .filter((m) => Boolean(m.url))
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((m) => ({ url: m.url as string, alt: m.alt || p.name }));
  if (gallery.length === 0 && p.cover_url) {
    gallery.push({ url: p.cover_url, alt: p.name });
  }

  const badges: ExperienceHeroDTO["badges"] = [];
  if (p.review_stats?.count > 0) {
    badges.push({
      label: `${p.review_stats.average.toFixed(2)} · ${p.review_stats.count} evaluaciones`,
      tone: "neutral",
      iconKey: "star",
    });
  }
  if (p.business?.verified) {
    badges.push({ label: "Empresa verificada", tone: "primary", iconKey: "badge-check" });
  }

  const meta: ExperienceHeroDTO["meta"] = [];
  if (p.business?.destination_slug) {
    meta.push({
      iconKey: "map-pin",
      label: p.business.destination_slug.replace(/-/g, " "),
    });
  }
  if (p.product_type) {
    meta.push({ iconKey: "tag", label: p.product_type });
  }

  const dto: ExperienceHeroDTO = {
    variant: gallery.length > 0 ? "gallery" : "editorial",
    eyebrow: p.product_type || null,
    title: p.name,
    description: p.tagline || null,
    media: gallery[0]
      ? { url: gallery[0].url, alt: gallery[0].alt, overlay: 0 }
      : null,
    mediaSlides: gallery,
    badges,
    meta,
    ctaPrimary: null,
    ctaSecondary: null,
  };

  return (
    <ExperienceHero
      dto={dto}
      headingLevel="h1"
      headerActionsSlot={
        <>
          <ShareProductButton title={p.name} />
          <FavoriteButton entityKind="product" entityId={p.id} />
        </>
      }
      extensionsSlot={
        <div className="flex flex-wrap items-center gap-2">
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

function ShareProductButton({ title }: { title: string }) {
  async function handleShare() {
    if (typeof navigator === "undefined") return;
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
      if (nav.share) {
        await nav.share({ title, url });
        return;
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      }
    } catch {
      /* usuario canceló */
    }
  }
  return (
    <button
      type="button"
      onClick={handleShare}
      aria-label="Compartir"
      className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-background/90 text-foreground shadow-soft backdrop-blur-sm transition hover:bg-background focus-visible:outline-none focus-visible:ring-focus"
    >
      <Share2 className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}