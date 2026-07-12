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
import { useHasStickyCta } from "@/lib/alux/sticky-cta-presence";

/** Prefijos de ruta con CTA sticky propio donde el flotante debe ocultarse. */
const HIDDEN_PATH_PREFIXES: readonly string[] = [
  "/cuenta/carrito",
  "/cuenta/pagos",
];

/**
 * Detecta fichas comerciales por URL (no por contexto rehidratado).
 *
 * Antes usábamos `ctx.business` / `ctx.product` de `useAluxContext`, pero
 * ese hook rehidrata desde sessionStorage tras visitar una ficha, así que
 * al volver al Home el contexto quedaba "pegado" y ocultaba el flotante
 * en páginas donde SÍ debe verse. La ruta es la única señal fiable.
 *
 * Ruta canónica: `/oriente-maya/:destino/:categoria/:empresa[/:producto]`.
 */
function detectFicha(pathname: string): "business" | "product" | null {
  if (!pathname.startsWith("/oriente-maya/")) return null;
  const segs = pathname.replace(/^\/oriente-maya\//, "").split("/").filter(Boolean);
  if (segs.length >= 4) return "product";
  if (segs.length >= 3) return "business";
  return null;
}

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
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const hasStickyCta = useHasStickyCta();

  const ficha = detectFicha(pathname);
  if (ficha === "product")
    return { shouldHide: true, reason: "ficha-product", bottomOffset: 0 };
  if (ficha === "business")
    return { shouldHide: true, reason: "ficha-business", bottomOffset: 0 };
  if (HIDDEN_PATH_PREFIXES.some((p) => pathname.startsWith(p))) {
    return { shouldHide: true, reason: "checkout", bottomOffset: 0 };
  }
  if (hasStickyCta)
    return { shouldHide: false, reason: "sticky-cta", bottomOffset: 88 };
  return { shouldHide: false, reason: "none", bottomOffset: 0 };
}