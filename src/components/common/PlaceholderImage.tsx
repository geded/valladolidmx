/**
 * PlaceholderImage — Sustituto sobrio de fotografía real.
 *
 * Propósito: ocupar el lugar de imágenes oficiales del Oriente Maya sin
 * usar imágenes generadas por IA como definitivas. Se reemplaza por
 * <img> oficial cuando el equipo provea el banco fotográfico.
 *
 * Responsabilidades:
 *  - Renderizar un gradiente territorial (4 variantes) con etiqueta.
 *  - Mantener relación de aspecto configurable.
 *
 * Dependencias: utilities `placeholder-*` en src/styles.css.
 */
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type PlaceholderPalette = "territorio" | "selva" | "cenote" | "atardecer";

interface Props extends HTMLAttributes<HTMLDivElement> {
  palette?: PlaceholderPalette;
  label?: string;
  aspect?: "video" | "square" | "portrait" | "4/3";
}

const PALETTE_CLASS: Record<PlaceholderPalette, string> = {
  territorio: "placeholder-territorio",
  selva: "placeholder-selva",
  cenote: "placeholder-cenote",
  atardecer: "placeholder-atardecer",
};

const ASPECT_CLASS: Record<NonNullable<Props["aspect"]>, string> = {
  video: "aspect-video",
  square: "aspect-square",
  portrait: "aspect-[3/4]",
  "4/3": "aspect-[4/3]",
};

export function PlaceholderImage({
  palette = "territorio",
  label,
  aspect = "4/3",
  className,
  ...rest
}: Props) {
  return (
    <div
      role="img"
      aria-label={label ? `Imagen ilustrativa: ${label}` : "Imagen ilustrativa"}
      className={cn(
        "relative w-full overflow-hidden rounded-2xl border border-border/60",
        ASPECT_CLASS[aspect],
        PALETTE_CLASS[palette],
        className,
      )}
      {...rest}
    >
      {label ? (
        <span className="absolute bottom-3 left-3 rounded-full bg-background/70 px-2.5 py-1 text-xs font-medium uppercase tracking-wider text-foreground/70 backdrop-blur">
          {label}
        </span>
      ) : null}
    </div>
  );
}
