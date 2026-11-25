import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ChevronLeft, ChevronRight, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EditorialMediaFrame } from "@/components/omxds/EditorialMediaFrame";
import { getPublicBusinessCardGallery, type CardGalleryPhoto } from "@/lib/catalog/business-card-gallery.functions";
import { cardGalleryPhotos } from "./card-gallery";
import { cn } from "@/lib/utils";

/** Shared photo-only capability; surrounding approved cards remain untouched. */
export function CardMediaGallery({ cover, name, businessId, photos: supplied, sizes,
  imageClassName = "h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]",
}: {
  cover: CardGalleryPhoto;
  name: string;
  businessId?: string;
  photos?: readonly CardGalleryPhoto[];
  sizes?: string;
  imageClassName?: string;
}) {
  const fetchGallery = useServerFn(getPublicBusinessCardGallery);
  const [extras, setExtras] = useState<readonly CardGalleryPhoto[]>(supplied ?? []);
  const [loaded, setLoaded] = useState(Boolean(supplied) || !businessId);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [index, setIndex] = useState(0);
  const [visited, setVisited] = useState(() => new Set([0]));
  const pending = useRef<Promise<CardGalleryPhoto[]> | null>(null);
  const track = useRef<HTMLDivElement>(null);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const photos = cardGalleryPhotos(cover, extras);

  async function ensurePhotos() {
    if (loaded || !businessId) return photos;
    if (pending.current) return pending.current;
    setBusy(true);
    setFailed(false);
    const request = fetchGallery({ data: { businessId } }).then(extra => {
      const result = cardGalleryPhotos(cover, extra);
      if (mounted.current) { setExtras(extra); setLoaded(true); }
      return result;
    }).catch(() => {
      if (mounted.current) setFailed(true);
      return [cover];
    }).finally(() => {
      pending.current = null;
      if (mounted.current) setBusy(false);
    });
    pending.current = request;
    return request;
  }

  async function move(next: number) {
    const available = await ensurePhotos();
    if (!mounted.current) return;
    const target = Math.max(0, Math.min(available.length - 1, next));
    setVisited(old => new Set([...old, target]));
    setIndex(target);
    requestAnimationFrame(() => {
      const element = track.current;
      if (!element) return;
      element.scrollTo({ left: target * element.clientWidth,
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
    });
  }

  function onScroll() {
    const element = track.current;
    if (!element?.clientWidth) return;
    const next = Math.round(element.scrollLeft / element.clientWidth);
    if (!loaded && element.scrollLeft > element.clientWidth / 4) {
      // Keep the real cover visible while the first swipe fetches metadata.
      element.scrollTo({ left: 0, behavior: "instant" });
      void move(1);
      return;
    }
    if (loaded) {
      const target = Math.min(next, photos.length - 1);
      setIndex(target);
      setVisited(old => old.has(target) ? old : new Set([...old, target]));
    }
  }

  const canAdvance = !loaded || index < photos.length - 1;
  return (
    <div className="relative h-full w-full" data-card-gallery={businessId ?? "supplied"}
      role="region" aria-label={`Fotos de ${name}`} aria-roledescription="carrusel"
      onClick={event => event.stopPropagation()}
      onKeyDown={event => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        event.stopPropagation();
        void move(index + (event.key === "ArrowRight" ? 1 : -1));
      }}>
      <div ref={track} onScroll={onScroll} aria-busy={busy}
        className="flex h-full w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {photos.map((photo, position) => (
          <div key={photo.assetId ?? photo.url} className="h-full w-full shrink-0 snap-center"
            role="group" aria-roledescription="diapositiva" aria-label={`${position + 1} de ${photos.length}`}>
            {visited.has(position) ? <EditorialMediaFrame media={{ url: photo.url, alt: photo.alt ?? name,
              ...(photo.asset ? { asset: photo.asset } : {}) }} context="card" sizes={sizes}
              className={imageClassName} /> : null}
          </div>
        ))}
        {!loaded ? <div aria-hidden className="h-full w-full shrink-0 snap-center" /> : null}
      </div>
      {index > 0 ? <Button type="button" variant="secondary" size="icon" title="Foto anterior"
        aria-label={`Foto anterior de ${name}`} onClick={event => { event.preventDefault(); void move(index - 1); }}
        className="absolute left-1 top-1/2 z-10 size-11 -translate-y-1/2 rounded-full bg-background/90 text-foreground shadow-soft md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
        <ChevronLeft aria-hidden />
      </Button> : null}
      {canAdvance ? <Button type="button" variant="secondary" size="icon" title={failed ? "Reintentar fotos" : "Foto siguiente"}
        aria-label={`${failed ? "Reintentar fotos" : "Foto siguiente"} de ${name}`} disabled={busy}
        onClick={event => { event.preventDefault(); void move(index + 1); }}
        className="absolute right-1 top-1/2 z-10 size-11 -translate-y-1/2 rounded-full bg-background/90 text-foreground shadow-soft md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
        {busy ? <LoaderCircle aria-hidden className="motion-safe:animate-spin" /> : <ChevronRight aria-hidden />}
      </Button> : null}
      {loaded && photos.length > 1 ? <div className="absolute inset-x-14 bottom-2 z-10 flex justify-center">
        {photos.map((photo, position) => <Button key={photo.assetId ?? photo.url} variant="ghost" size="icon"
          type="button" title={`Foto ${position + 1}`} aria-label={`Foto ${position + 1} de ${name}`}
          aria-current={index === position ? "true" : undefined}
          onClick={event => { event.preventDefault(); void move(position); }}
          className="size-6 rounded-full p-0 hover:bg-transparent">
          <span className={cn("h-1.5 w-1.5 rounded-full bg-background/60 shadow-soft", index === position && "w-3 bg-background")} />
        </Button>)}
      </div> : null}
      <span className="sr-only" role="status">{failed ? "No se pudieron cargar las fotos. Puedes reintentar." : loaded ? `Foto ${index + 1} de ${photos.length}` : ""}</span>
    </div>
  );
}