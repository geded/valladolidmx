/* eslint-disable react-refresh/only-export-components -- module intentionally co-exports helpers with its components; affects only dev fast refresh. */
/**
 * G8-R1-F1L · Marcador editorial neutral — componente único reutilizable.
 *
 * Regla vinculante (F1K + F1L·P0): la ausencia de fotografía acreditada
 * G8-M1 NUNCA expulsa a una entidad de su familia premium. Sólo bloquea el
 * modo Cinematográfico y sustituye el hueco fotográfico por el marcador
 * neutral piedra/caliza ya aprobado en `DestinationPremiumSurface`.
 *
 * Este módulo EXTRAE ese marcador aprobado; no introduce diseño nuevo.
 * Toda superficie premium (Home, Destino, Empresa, Producto, Evento, Lugar)
 * debe consumirlo en lugar de emitir `<img>` sin fallback.
 */
import { useLayoutEffect, useRef, useState } from "react";
import { useHydrated } from "@tanstack/react-router";
import logoSymbol from "@/assets/brand/logo-symbol.png.asset.json";
import { cn } from "@/lib/utils";
import { resolveMediaSource, type MediaUsageContext } from "@/lib/media/resolve-source";
import { hasEditorialMedia, type EditorialMedia } from "./editorial-media";

export type { EditorialMedia };

export interface EditorialMediaFrameProps {
  /** Medio acreditado. `null`, ausente o con `url` vacía ⇒ marcador neutral. */
  media?: EditorialMedia | null;
  /** Rótulo editorial mostrado dentro del marcador neutral. */
  label?: string;
  /** Clases compartidas por la imagen y el marcador (forma y tamaño). */
  className?: string;
  /** Clases adicionales sólo para el marcador neutral. */
  markerClassName?: string;
  loading?: "eager" | "lazy";
  fetchPriority?: "high" | "low" | "auto";
  /** Tamaños responsivos del espacio real ocupado por la imagen. */
  sizes?: string;
  /** Contexto que selecciona la familia correcta de variantes derivadas. */
  context?: MediaUsageContext;
  /**
   * Símbolo tenue de la marca en el fondo crema mientras la foto carga.
   * Por omisión sólo en portadas (`context="hero"`); las tarjetas usan el
   * fondo crema sin símbolo.
   */
  placeholderMark?: boolean;
}

const MEDIA_MARK_STYLE = { "--omxds-media-mark": `url("${logoSymbol.url}")` } as const;

/** `object-position` a partir del punto de enfoque editorial (0–1). */
export function focalStyle(focal?: { x: number; y: number } | null) {
  if (!focal || !Number.isFinite(focal.x) || !Number.isFinite(focal.y)) return undefined;
  const c = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 100);
  return { objectPosition: `${c(focal.x)}% ${c(focal.y)}%` };
}

export function EditorialMediaFrame({
  media,
  label,
  className,
  markerClassName,
  loading = "lazy",
  fetchPriority,
  sizes,
  context = "editorial",
  placeholderMark,
}: EditorialMediaFrameProps) {
  if (hasEditorialMedia(media)) {
    const resolved = resolveMediaSource(media?.asset, {
      context,
      fallbackUrl: media!.url,
      sizes,
      priority: fetchPriority,
    });
    return (
      <EditorialPicture
        resolved={resolved}
        media={media!}
        className={className}
        loading={loading}
        fetchPriority={fetchPriority}
        placeholderMark={placeholderMark ?? context === "hero"}
      />
    );
  }

  return (
    <div
      data-omxds-media="editorial-neutral"
      role="img"
      aria-label={label ? `${label} · sin fotografía acreditada` : "Sin fotografía acreditada"}
      className={cn(
        "flex items-end border border-border bg-muted p-4 sm:p-6",
        className,
        markerClassName,
      )}
    >
      {label ? (
        <p className="line-clamp-3 font-serif text-lg leading-snug text-foreground/80 sm:text-2xl">
          {label}
        </p>
      ) : null}
    </div>
  );
}

type ResolvedMedia = ReturnType<typeof resolveMediaSource>;

/**
 * Fotografía acreditada con espera discreta: fondo crema (y, en portadas, el
 * símbolo tenue de la marca) hasta que la foto decodifica; después aparece con
 * un desvanecido corto. El HTML del servidor nunca oculta la foto, para no
 * retrasar la primera pintura; la espera sólo aplica tras hidratar.
 */
function EditorialPicture({
  resolved,
  media,
  className,
  loading,
  fetchPriority,
  placeholderMark,
}: {
  resolved: ResolvedMedia;
  media: EditorialMedia;
  className?: string;
  loading: "eager" | "lazy";
  fetchPriority?: "high" | "low" | "auto";
  placeholderMark: boolean;
}) {
  const hydrated = useHydrated();
  const imgRef = useRef<HTMLImageElement>(null);
  // Sólo la primera carga espera: si después cambia la fuente (carrusel,
  // URL firmada renovada al actualizar), la foto anterior sigue visible.
  const [revealed, setRevealed] = useState(false);
  const [animate, setAnimate] = useState(false);
  // Fallo de red (p. ej. al abrir la app instalada): un reintento con la foto
  // original; si vuelve a fallar se queda el fondo crema con el símbolo, nunca
  // el ícono roto del navegador ni el color de la tarjeta.
  const [retrySrc, setRetrySrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const hideUntilLoaded = (hydrated && !revealed) || failed;

  useLayoutEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    // Foto ya en caché o pintada antes de hidratar: se muestra sin animación.
    if (img.complete) {
      // Falló antes de hidratar (React no vio el error): reintentar igual.
      if (img.naturalWidth === 0 && media.url) {
        const sep = media.url.includes("?") ? "&" : "?";
        setRetrySrc(`${media.url}${sep}r=1`);
        return;
      }
      setRevealed(true);
      return;
    }
    const reveal = () => {
      setAnimate(true);
      setRevealed(true);
    };
    img.addEventListener("load", reveal, { once: true });
    return () => {
      img.removeEventListener("load", reveal);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sólo la primera carga
  }, []);

  const handleError = () => {
    if (retrySrc === null && media.url) {
      const sep = media.url.includes("?") ? "&" : "?";
      setRetrySrc(`${media.url}${sep}r=1`);
      return;
    }
    setFailed(true);
    setRevealed(true);
  };

  const classTokens = (className ?? "").split(/\s+/).filter(Boolean);
  const isAbsolute = classTokens.includes("absolute");
  // El marco recibe UNA sola vez toda la geometría declarada por la plantilla
  // (alto, ancho, proporción, posición, margen y radio). Duplicar esas clases
  // también sobre <img> creaba una segunda geometría intrínseca: al decodificar
  // la foto, WebKit recalculaba primero la imagen y después el <picture>, que es
  // el agrandamiento visible durante el scroll en el canvas de 1024 px.
  const imagePresentationClass = classTokens
    .filter((token) =>
      /^(object-|transition(?:-|$)|duration-|ease-|opacity-|scale-|transform(?:-|$)|group-hover:|hover:|motion-)/.test(
        token,
      ),
    )
    .join(" ");
  const reservedRatio =
    resolved.width && resolved.height ? `${resolved.width} / ${resolved.height}` : undefined;
  const hasExplicitHeight = /(^|\s)(h-|aspect-|min-h-)/.test(className ?? "");
  return (
    <picture
      data-omxds-media-state={failed ? "failed" : revealed ? "ready" : "loading"}
      {...(placeholderMark || failed ? { "data-omxds-media-mark": "" } : {})}
      className={cn("block min-w-0 max-w-full overflow-hidden", className, isAbsolute && "inset-0")}
      style={{
        ...((placeholderMark && !revealed) || failed ? MEDIA_MARK_STYLE : {}),
        ...(!isAbsolute && !hasExplicitHeight && reservedRatio
          ? { aspectRatio: reservedRatio }
          : {}),
      }}
    >
      {(retrySrc ? [] : resolved.sources).map((source) => (
        <source
          key={source.type}
          type={source.type}
          srcSet={source.srcSet}
          {...(source.sizes ? { sizes: source.sizes } : {})}
        />
      ))}
      <img
        src={retrySrc ?? resolved.src}
        alt={media.alt}
        onError={handleError}
        onLoad={() => {
          if (!revealed) {
            setAnimate(true);
            setRevealed(true);
          }
        }}
        loading={loading}
        width={resolved.width}
        height={resolved.height}
        {...(resolved.sizes ? { sizes: resolved.sizes } : {})}
        {...(fetchPriority ? { fetchPriority } : {})}
        data-omxds-media="g8-m1"
        ref={imgRef}
        style={{ ...focalStyle(media.focal), ...(hideUntilLoaded ? { opacity: 0 } : {}) }}
        className={cn(
          "block h-full w-full max-w-full",
          imagePresentationClass,
          revealed && animate && "omxds-media-reveal",
        )}
      />
    </picture>
  );
}
