/**
 * G8-R1-C+L · E/F/H — Marca visual canónica de Alux IA.
 *
 * ÚNICO componente autorizado para renderizar la imagen de Alux en toda la
 * plataforma (Home, Destino, Listados, Hotel, Restaurante, Evento,
 * Experiencia, Tour, Producto, Lugar, Landing SEO y rutas futuras).
 *
 * Consume exclusivamente los activos gobernados de `/brand/alux/`
 * (manifiesto: `public/brand/alux/manifest.json`). Prohibido copiar el
 * activo dentro de plantillas o generar variantes locales.
 *
 * Accesibilidad (sección H de la autorización):
 *  - Con texto contiguo "Alux" ⇒ decorativa (`alt=""`, `aria-hidden`).
 *  - Sin texto contiguo ⇒ `alt="Alux, concierge IA de Valladolid.mx"`.
 *  - `object-contain`, sin cambios de layout (width/height explícitos).
 */

import { ACTIVE_BRAND } from "@/config/brand";

export type AluxMarkFamily = "full" | "avatar";

const FULL_SIZES = [96, 128, 192, 256, 384, 512] as const;
const AVATAR_SIZES = [32, 40, 44, 48, 64, 80, 96, 128, 192] as const;

export const ALUX_ACCESSIBLE_NAME = `${ACTIVE_BRAND.conciergeName}, concierge IA de ${ACTIVE_BRAND.name}`;

function nearest(sizes: readonly number[], size: number): number {
  return sizes.reduce((best, s) => (Math.abs(s - size) < Math.abs(best - size) ? s : best));
}

function stem(family: AluxMarkFamily): string {
  return family === "full" ? "alux-ia-full" : "alux-ia-avatar";
}

function srcFor(family: AluxMarkFamily, size: number, fmt: "png" | "webp" | "avif"): string {
  return `/brand/alux/${fmt}/${stem(family)}-${size}.${fmt}`;
}

export interface AluxMarkProps {
  /** `full` = cuerpo completo (bloques, estados vacíos). `avatar` = compacto. */
  family?: AluxMarkFamily;
  /** Tamaño CSS deseado en px; se ancla a la derivada gobernada más cercana. */
  size?: number;
  /**
   * `true` cuando existe texto contiguo "Alux" / "Alux · Concierge IA".
   * En ese caso la imagen es decorativa.
   */
  decorative?: boolean;
  className?: string;
  /** El dock usa `eager`; el bloque interior usa `lazy` (sección H). */
  loading?: "lazy" | "eager";
}

export function AluxMark({
  family = "avatar",
  size = 48,
  decorative = false,
  className,
  loading = "lazy",
}: AluxMarkProps) {
  const sizes = family === "full" ? FULL_SIZES : AVATAR_SIZES;
  const px = nearest(sizes, size);
  const srcSet = (fmt: "webp" | "avif") =>
    sizes
      .filter((s) => s >= px)
      .slice(0, 3)
      .map((s) => `${srcFor(family, s, fmt)} ${s}w`)
      .join(", ");

  return (
    <picture>
      <source type="image/avif" srcSet={srcSet("avif")} sizes={`${size}px`} />
      <source type="image/webp" srcSet={srcSet("webp")} sizes={`${size}px`} />
      <img
        src={srcFor(family, px, "png")}
        width={size}
        height={size}
        loading={loading}
        decoding="async"
        alt={decorative ? "" : ALUX_ACCESSIBLE_NAME}
        aria-hidden={decorative ? true : undefined}
        className={className ? `object-contain ${className}` : "object-contain"}
        style={{ width: size, height: size }}
      />
    </picture>
  );
}

export default AluxMark;
