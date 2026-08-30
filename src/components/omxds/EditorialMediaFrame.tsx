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
}

export function EditorialMediaFrame({
  media,
  label,
  className,
  markerClassName,
  loading = "lazy",
  fetchPriority,
}: EditorialMediaFrameProps) {
  if (hasEditorialMedia(media)) {
    return (
      <img
        src={media!.url}
        alt={media!.alt}
        loading={loading}
        {...(fetchPriority ? { fetchPriority } : {})}
        data-omxds-media="g8-m1"
        className={className}
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
