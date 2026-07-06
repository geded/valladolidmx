/**
 * useAluxFloatingPresence — AT-0 (Política de Presencia de Alux).
 *
 * Regla declarativa única que decide si el botón flotante `AluxFloatingTrigger`
 * debe estar visible en la superficie actual, o si debe cederle el espacio a
 * los CTAs stickies del contenido (Reservar, WhatsApp, Añadir al viaje,
 * Pagar, etc.). En esas superficies Alux sigue presente vía chip inline
 * dentro del contenido (bloques oficiales) — no como flotante superpuesto.
 *
 * Se apoya en dos señales:
 *  · Semántica  → `useAluxContext()`: si hay ancla `business` o `product`,
 *    estamos en una ficha con CTA comercial sticky.
 *  · Ruta       → pathname del router: carrito y pagos también.
 *
 * SSR-safe. Nunca lanza. No introduce contratos nuevos.
 */
import { useRouterState } from "@tanstack/react-router";
import { useAluxContext } from "@/lib/alux/use-alux-context";
import { useHasStickyCta } from "@/lib/alux/sticky-cta-presence";

/** Prefijos de ruta con CTA sticky propio donde el flotante debe ocultarse. */
const HIDDEN_PATH_PREFIXES: readonly string[] = [
  "/cuenta/carrito",
  "/cuenta/pagos",
];

export interface AluxFloatingPresence {
  /** El flotante debe ocultarse en la superficie actual. */
  readonly shouldHide: boolean;
  /** Motivo (para tooling/debug; nunca visible al usuario). */
  readonly reason:
    | "ficha-business"
    | "ficha-product"
    | "checkout"
    | "sticky-cta"
    | "none";
  /**
   * Offset vertical adicional (px) que el flotante debe respetar para no
   * solapar barras sticky comerciales. 0 cuando no hay barra activa.
   */
  readonly bottomOffset: number;
}

export function useAluxFloatingPresence(): AluxFloatingPresence {
  const ctx = useAluxContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const hasStickyCta = useHasStickyCta();

  if (ctx.product)
    return { shouldHide: true, reason: "ficha-product", bottomOffset: 0 };
  if (ctx.business)
    return { shouldHide: true, reason: "ficha-business", bottomOffset: 0 };
  if (HIDDEN_PATH_PREFIXES.some((p) => pathname.startsWith(p))) {
    return { shouldHide: true, reason: "checkout", bottomOffset: 0 };
  }
  // Superficie con CTA sticky (destino, categoría, etc.): Alux sigue
  // presente como copiloto, pero se eleva por encima de la barra.
  if (hasStickyCta)
    return { shouldHide: false, reason: "sticky-cta", bottomOffset: 88 };
  return { shouldHide: false, reason: "none", bottomOffset: 0 };
}