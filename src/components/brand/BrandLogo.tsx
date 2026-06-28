/**
 * BrandLogo — Marca oficial de Valladolid.mx.
 *
 * Renderiza el logotipo oficial almacenado en `docs/brand-assets/logos/`
 * (copia de trabajo en `src/assets/brand/logo.png`). Respeta proporciones,
 * colores y composición originales (Doc 12B).
 *
 * Variantes presentacionales (no alteran el logotipo):
 *  - tone="dark"  → fondos claros (Header sticky, Footer).
 *  - tone="light" → fondos oscuros / sobre fotografía (Hero overlay):
 *    se aplica una sombra suave para legibilidad, sin recolorear.
 */
import { cn } from "@/lib/utils";
import { SITE } from "@/config/site";
import logoUrl from "@/assets/brand/logo.png";

interface Props {
  tone?: "dark" | "light";
  showWordmark?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

// Aspect ratio nativo del logotipo oficial: 470 × 159 ≈ 2.956
const SIZE_MAP = {
  sm: "h-7",
  md: "h-9",
  lg: "h-12",
} as const;

export function BrandLogo({ tone = "dark", showWordmark: _showWordmark = true, size = "md", className }: Props) {
  return (
    <img
      src={logoUrl}
      alt={SITE.name}
      width={470}
      height={159}
      className={cn(
        "w-auto select-none",
        SIZE_MAP[size],
        tone === "light" && "drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]",
        className,
      )}
      draggable={false}
    />
  );
}