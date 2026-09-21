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
}: EditorialMediaFrameProps) {
  if (hasEditorialMedia(media)) {
    const resolved = resolveMediaSource(media?.asset, {
      context,
      fallbackUrl: media!.url,
      sizes,
      priority: fetchPriority,
    });
    const isAbsolute = className?.includes("absolute") ?? false;
    // El hueco de la foto debe existir ANTES de que la imagen cargue. Sin esto,
    // al hacer scroll la carga diferida cambia la altura del marco y la sección
    // "salta" y se reacomoda. El contenedor hereda la forma/tamaño declarados
    // (sin las clases de encuadre) y reserva la proporción intrínseca.
    const frameSizingClass = (className ?? "")
      .split(/\s+/)
      .filter((token) => token && !/^(object-|absolute$|inset-)/.test(token))
      .join(" ");
    const reservedRatio =
      resolved.width && resolved.height ? `${resolved.width} / ${resolved.height}` : undefined;
    const hasExplicitHeight = /(^|\s)(h-|aspect-|min-h-)/.test(className ?? "");
    return (
      <picture
        className={cn(
          "block min-w-0 max-w-full overflow-hidden",
          isAbsolute ? "absolute inset-0" : frameSizingClass,
        )}
        style={
          !isAbsolute && !hasExplicitHeight && reservedRatio
            ? { aspectRatio: reservedRatio }
            : undefined
        }
      >
        {resolved.sources.map((source) => (
          <source
            key={source.type}
            type={source.type}
            srcSet={source.srcSet}
            {...(source.sizes ? { sizes: source.sizes } : {})}
          />
        ))}
        <img
          src={resolved.src}
          alt={media!.alt}
          loading={loading}
          width={resolved.width}
          height={resolved.height}
          {...(resolved.sizes ? { sizes: resolved.sizes } : {})}
          {...(fetchPriority ? { fetchPriority } : {})}
          data-omxds-media="g8-m1"
          className={cn(className, "block h-full w-full max-w-full")}
        />
      </picture>
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
