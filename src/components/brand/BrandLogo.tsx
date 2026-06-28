/**
 * BrandLogo — Marca de Valladolid.mx.
 *
 * Propósito: presentar la marca de forma centralizada y reemplazable.
 *
 * Estado Fase 0 (Doc 12B): NO se utiliza isotipo, símbolo ni favicon
 * inventados. Mientras llega el logotipo oficial, se renderiza únicamente
 * la denominación textual "Valladolid.mx" usando la tipografía display
 * del Design System.
 *
 * Reemplazo futuro: cuando llegue el SVG oficial, sustituir el wordmark
 * por un `<img src=…>` manteniendo la MISMA API (`tone`, `size`,
 * `showWordmark`, `className`). Ningún consumidor necesita cambiar.
 *
 * Variantes:
 *  - tone="dark"  → para fondos claros (Header sticky, Footer).
 *  - tone="light" → para fondos oscuros / sobre fotografía (Hero overlay).
 */
import { cn } from "@/lib/utils";
import { SITE } from "@/config/site";

interface Props {
  tone?: "dark" | "light";
  showWordmark?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_MAP = {
  sm: { text: "text-base" },
  md: { text: "text-lg" },
  lg: { text: "text-2xl" },
} as const;

export function BrandLogo({ tone = "dark", showWordmark: _showWordmark = true, size = "md", className }: Props) {
  const s = SIZE_MAP[size];
  // Doc 12B: solo wordmark textual hasta recibir el logotipo oficial.
  return (
    <span
      className={cn(
        "inline-flex items-center font-display font-semibold tracking-tight",
        s.text,
        tone === "light"
          ? "text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]"
          : "text-foreground",
        className,
      )}
    >
      {SITE.name}
    </span>
  );
}