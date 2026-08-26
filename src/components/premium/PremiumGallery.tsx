/**
 * G4-SYSTEM-01 · Galería premium compartida.
 *
 * Consolida los cuatro layouts aprobados en los previews G4:
 * mosaico | carrusel | cuadricula | tira. La galería es un eje
 * INDEPENDIENTE de la dirección visual (Editorial/Cinematográfica).
 */
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  DEFAULT_PREMIUM_GALLERY_LAYOUT,
  type PremiumGalleryLayout,
} from "@/lib/omxds/presentation/premium-presentation";
import {
  sanitizePremiumMedia,
  type PremiumGalleryVM,
} from "@/lib/omxds/presentation/premium-view-models";

function Photo({ url, alt, className }: { url: string; alt: string; className?: string }) {
  return (
    <img
      src={url}
      alt={alt}
      loading="lazy"
      className={cn("h-full w-full object-cover", className)}
    />
  );
}

export function PremiumGallery({ vm, className }: { vm: PremiumGalleryVM; className?: string }) {
  const items = sanitizePremiumMedia(vm.items);
  const layout: PremiumGalleryLayout = vm.layout ?? DEFAULT_PREMIUM_GALLERY_LAYOUT;
  const [index, setIndex] = useState(0);

  if (items.length === 0) {
    return (
      <div
        className={cn(
          "rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground",
          className,
        )}
      >
        {vm.emptyLabel ?? "Sin fotografías acreditadas todavía."}
      </div>
    );
  }

  if (layout === "carrusel") {
    const active = items[Math.min(index, items.length - 1)]!;
    return (
      <figure className={cn("overflow-hidden rounded-2xl bg-card shadow-soft", className)}>
        <div className="relative aspect-[4/3] sm:aspect-[16/9]">
          <Photo url={active.url} alt={active.alt} />
          <span className="absolute bottom-3 right-3 rounded-pill bg-background/90 px-2.5 py-1 text-xs font-medium text-foreground">
            {Math.min(index, items.length - 1) + 1} / {items.length}
          </span>
        </div>
        <div className="flex gap-2 overflow-x-auto p-3">
          {items.map((item, itemIndex) => (
            <button
              key={item.url}
              type="button"
              onClick={() => setIndex(itemIndex)}
              aria-label={`Ver fotografía ${itemIndex + 1} de ${items.length}`}
              aria-current={itemIndex === index}
              className={cn(
                "h-14 w-20 shrink-0 overflow-hidden rounded-lg ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                itemIndex === index ? "ring-2 ring-primary" : "opacity-70 hover:opacity-100",
              )}
            >
              <Photo url={item.url} alt="" />
            </button>
          ))}
        </div>
      </figure>
    );
  }

  if (layout === "tira") {
    return (
      <ul className={cn("flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2", className)}>
        {items.map((item) => (
          <li
            key={item.url}
            className="aspect-[3/4] w-40 shrink-0 snap-start overflow-hidden rounded-2xl bg-card shadow-soft sm:w-52"
          >
            <Photo url={item.url} alt={item.alt} />
          </li>
        ))}
      </ul>
    );
  }

  if (layout === "cuadricula") {
    return (
      <ul className={cn("grid grid-cols-2 gap-3 lg:grid-cols-3", className)}>
        {items.map((item) => (
          <li
            key={item.url}
            className="aspect-square overflow-hidden rounded-2xl bg-card shadow-soft"
          >
            <Photo url={item.url} alt={item.alt} />
          </li>
        ))}
      </ul>
    );
  }

  // mosaico
  const [lead, ...rest] = items;
  return (
    <div className={cn("grid gap-3 sm:grid-cols-2", className)}>
      <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-card shadow-soft sm:row-span-2 sm:aspect-auto sm:min-h-[320px]">
        <Photo url={lead!.url} alt={lead!.alt} />
      </div>
      {rest.slice(0, 4).map((item) => (
        <div
          key={item.url}
          className="aspect-[4/3] overflow-hidden rounded-2xl bg-card shadow-soft sm:aspect-[3/2]"
        >
          <Photo url={item.url} alt={item.alt} />
        </div>
      ))}
    </div>
  );
}
