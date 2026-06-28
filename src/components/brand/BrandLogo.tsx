/**
 * BrandLogo — Marca de Valladolid.mx.
 *
 * Propósito: presentar la identidad de marca de forma centralizada y
 * reemplazable. Hoy renderiza una marca compuesta (símbolo SVG + wordmark)
 * fiel al ADN visual del sitio oficial (anillo cálido ocre + acentos selva y
 * cenote) mientras el equipo entrega el logotipo oficial en alta resolución.
 *
 * Reemplazo futuro: sustituir el bloque `<Mark/>` por un `<img src=…>` con
 * el activo oficial. El resto del layout (wordmark, tamaño, variantes) NO
 * cambia, así que la sustitución es puntual.
 *
 * Variantes:
 *  - tone="dark"  → para fondos claros (Header sticky, Footer).
 *  - tone="light" → para fondos oscuros / sobre fotografía (Hero overlay).
 *
 * Dependencias: ninguna runtime; solo tokens del Design System.
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
  sm: { mark: "size-7", text: "text-base" },
  md: { mark: "size-9", text: "text-lg" },
  lg: { mark: "size-12", text: "text-2xl" },
} as const;

function Mark({ className }: { className?: string }) {
  // Anillo cálido (ocre + verde selva + azul cenote) — síntesis del logotipo
  // oficial. Stroke generoso y caps redondeados para sensación premium.
  return (
    <svg
      viewBox="0 0 40 40"
      role="img"
      aria-label={`${SITE.name} símbolo`}
      className={cn("shrink-0", className)}
    >
      <defs>
        <linearGradient id="vmx-ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="oklch(0.72 0.16 65)" />
          <stop offset="55%" stopColor="oklch(0.62 0.14 55)" />
          <stop offset="100%" stopColor="oklch(0.48 0.10 155)" />
        </linearGradient>
      </defs>
      <circle cx="20" cy="20" r="14" fill="none" stroke="url(#vmx-ring)" strokeWidth="4" strokeLinecap="round" strokeDasharray="62 28" transform="rotate(-30 20 20)" />
      <circle cx="20" cy="20" r="4.5" fill="oklch(0.62 0.12 215)" />
    </svg>
  );
}

export function BrandLogo({ tone = "dark", showWordmark = true, size = "md", className }: Props) {
  const s = SIZE_MAP[size];
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <Mark className={s.mark} />
      {showWordmark ? (
        <span
          className={cn(
            "font-display font-semibold tracking-tight",
            s.text,
            tone === "light" ? "text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]" : "text-foreground",
          )}
        >
          {SITE.name}
        </span>
      ) : null}
    </span>
  );
}