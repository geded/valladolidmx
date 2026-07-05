/**
 * H-03 · Ola I1.c — `vmx.experience.gallery` (Capa 1: Presentación).
 *
 * Componente puro. Mobile-first, accesible (WCAG AA). Sin fetching.
 * Soporta lightbox opcional (browser-only). No emite side-effects
 * cuando `capabilities.lightbox` es `false`.
 */
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  ExperienceGalleryDTO,
  ExperienceGalleryItem,
} from "@/lib/experience-builder/blocks/experience-gallery/contract";

const ASPECT: Record<string, string> = {
  landscape: "aspect-[4/3]",
  square: "aspect-square",
  portrait: "aspect-[3/4]",
  auto: "",
};

export interface ExperienceGalleryProps {
  dto: ExperienceGalleryDTO;
  className?: string;
}

export function ExperienceGallery({ dto, className }: ExperienceGalleryProps) {
  const { variant, items, maxVisible, aspect, capabilities, heading, subheading, ariaLabel } = dto;
  const visible = items.slice(0, maxVisible);
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const open = useCallback(
    (i: number) => {
      if (!capabilities.lightbox) return;
      setOpenIdx(i);
    },
    [capabilities.lightbox],
  );
  const close = useCallback(() => setOpenIdx(null), []);
  const nav = useCallback(
    (dir: 1 | -1) => {
      setOpenIdx((idx) => (idx === null ? idx : (idx + dir + visible.length) % visible.length));
    },
    [visible.length],
  );

  useEffect(() => {
    if (openIdx === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") nav(1);
      if (e.key === "ArrowLeft") nav(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openIdx, close, nav]);

  if (visible.length === 0) return null;

  return (
    <section aria-label={ariaLabel} data-eb-block="experience-gallery" className={cn("w-full", className)}>
      {(heading || subheading) && (
        <header className="mb-4 flex flex-col gap-1">
          {heading ? <h2 className="text-2xl font-semibold tracking-tight">{heading}</h2> : null}
          {subheading ? <p className="text-sm text-muted-foreground">{subheading}</p> : null}
        </header>
      )}
      {variant === "carousel" ? (
        <ul
          className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 [scrollbar-width:none]"
          role="list"
        >
          {visible.map((it, i) => (
            <li key={i} className="min-w-[80%] snap-start sm:min-w-[45%] md:min-w-[32%]">
              <Thumb item={it} aspect={aspect} onClick={() => open(i)} lightbox={!!capabilities.lightbox} captions={!!capabilities.captions} />
            </li>
          ))}
        </ul>
      ) : variant === "strip" ? (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6" role="list">
          {visible.map((it, i) => (
            <li key={i}>
              <Thumb item={it} aspect="square" onClick={() => open(i)} lightbox={!!capabilities.lightbox} captions={false} />
            </li>
          ))}
        </ul>
      ) : variant === "grid" ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4" role="list">
          {visible.map((it, i) => (
            <li key={i}>
              <Thumb item={it} aspect={aspect} onClick={() => open(i)} lightbox={!!capabilities.lightbox} captions={!!capabilities.captions} />
            </li>
          ))}
        </ul>
      ) : (
        // mosaic
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:grid-rows-2">
          {visible.map((it, i) => (
            <div
              key={i}
              className={cn(
                i === 0 && "sm:col-span-2 sm:row-span-2",
              )}
            >
              <Thumb item={it} aspect={i === 0 ? "landscape" : "square"} onClick={() => open(i)} lightbox={!!capabilities.lightbox} captions={!!capabilities.captions} />
            </div>
          ))}
        </div>
      )}

      {openIdx !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={visible[openIdx]?.alt || "Imagen"}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={close}
        >
          <button
            type="button"
            aria-label="Cerrar"
            className="absolute right-4 top-4 rounded-pill bg-white/10 p-2 text-white hover:bg-white/20 focus-visible:outline-none focus-visible:ring-focus"
            onClick={(e) => { e.stopPropagation(); close(); }}
          >
            <X className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Anterior"
            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-pill bg-white/10 p-2 text-white hover:bg-white/20 focus-visible:outline-none focus-visible:ring-focus"
            onClick={(e) => { e.stopPropagation(); nav(-1); }}
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <img
            src={visible[openIdx]!.url}
            alt={visible[openIdx]!.alt}
            className="max-h-[85vh] max-w-[95vw] rounded-md object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            aria-label="Siguiente"
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-pill bg-white/10 p-2 text-white hover:bg-white/20 focus-visible:outline-none focus-visible:ring-focus"
            onClick={(e) => { e.stopPropagation(); nav(1); }}
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </div>
      )}
    </section>
  );
}

function Thumb({
  item,
  aspect,
  onClick,
  lightbox,
  captions,
}: {
  item: ExperienceGalleryItem;
  aspect: keyof typeof ASPECT | string;
  onClick: () => void;
  lightbox: boolean;
  captions: boolean;
}) {
  const cls = ASPECT[aspect as string] ?? ASPECT.landscape;
  const inner = (
    <>
      <img
        src={item.url}
        alt={item.alt}
        loading="lazy"
        className={cn("h-full w-full rounded-md object-cover transition group-hover:scale-[1.02]", cls)}
      />
      {captions && item.caption ? (
        <span className="mt-1 block truncate text-xs text-muted-foreground">{item.caption}</span>
      ) : null}
    </>
  );
  if (!lightbox) return <div className={cn("group overflow-hidden", cls && "relative")}>{inner}</div>;
  return (
    <button
      type="button"
      onClick={onClick}
      className="group block w-full overflow-hidden rounded-md text-left focus-visible:outline-none focus-visible:ring-focus"
      aria-label={`Abrir ${item.alt || "imagen"}`}
    >
      {inner}
    </button>
  );
}