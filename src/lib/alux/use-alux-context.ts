/**
 * useAluxContext — Hook oficial del Concierge Alux (US-E1.1).
 *
 * Fuente única: Context Engine (live-context pub/sub) + Navigation
 * Session (persistencia territorial N3). NO crea contratos paralelos,
 * NO compone rutas y NO llama al backend. Su rol es exponer, a
 * cualquier superficie inteligente (AluxFloatingTrigger, futuras
 * capas Related / Arma tu Viaje / Recomendaciones), un contexto
 * territorial ya resuelto y explicable.
 *
 * Reglas:
 *  · SSR-safe. En servidor devuelve un contexto vacío.
 *  · Prioriza el contexto vivo del Context Engine; si aún no publicó
 *    (deep-link, montaje inicial), rehidrata desde
 *    `useNavigationSession()`.
 *  · No inventa datos: si un slot no existe, se omite.
 *  · Devuelve `reason` humano y explicable derivado del propio
 *    Context Engine — nunca opinable, nunca oculto.
 */
import { useEffect, useState } from "react";
import {
  subscribeResolvedContext,
  getLatestResolvedContext,
  type ResolvedContext,
  type ContextNode,
} from "@/lib/context-engine";
import {
  useNavigationSession,
  type NavigationSessionSlot,
} from "@/lib/navigation/session-context";

export interface AluxContextSlot {
  readonly slug: string;
  readonly label: string;
  readonly href?: string;
}

export interface AluxContext {
  /** Hay algún ancla territorial (mínimo: destino). */
  readonly hasContext: boolean;
  readonly region?: AluxContextSlot;
  readonly destination?: AluxContextSlot;
  readonly category?: AluxContextSlot;
  readonly business?: AluxContextSlot;
  readonly product?: AluxContextSlot;
  /** Nodos relacionados publicados por el Context Engine (nunca inventados). */
  readonly related: readonly AluxContextSlot[];
  /** Path canónico del contexto vivo (si existe). */
  readonly canonical?: string;
  /** Justificación humana y explicable del contexto actual. */
  readonly reason: string;
  /** Origen del contexto: en vivo (Context Engine) o rehidratado (sessionStorage). */
  readonly origin: "live" | "session" | "none";
}

const EMPTY: AluxContext = {
  hasContext: false,
  related: [],
  reason: "Aún no exploras un destino del Oriente Maya.",
  origin: "none",
};

function nodeToSlot(node: ContextNode | undefined): AluxContextSlot | undefined {
  if (!node || !node.slug) return undefined;
  return { slug: node.slug, label: node.label, href: node.href };
}

function sessionSlot(slot: NavigationSessionSlot | undefined): AluxContextSlot | undefined {
  if (!slot) return undefined;
  return { slug: slot.slug, label: slot.label, href: slot.href };
}

function buildReason(ctx: {
  destination?: AluxContextSlot;
  category?: AluxContextSlot;
  business?: AluxContextSlot;
  product?: AluxContextSlot;
}): string {
  const { destination, category, business, product } = ctx;
  if (product && business) {
    return `Estás viendo ${product.label} en ${business.label}${destination ? `, ${destination.label}` : ""}.`;
  }
  if (business) {
    return `Estás explorando ${business.label}${destination ? ` en ${destination.label}` : ""}.`;
  }
  if (category && destination) {
    return `Estás explorando ${category.label} en ${destination.label}.`;
  }
  if (destination) {
    return `Estás explorando ${destination.label}.`;
  }
  return EMPTY.reason;
}

function fromLive(ctx: ResolvedContext): AluxContext {
  const destinationNode =
    ctx.destination ?? (ctx.current.kind === "destination" ? ctx.current : undefined);
  if (!destinationNode || !destinationNode.slug) return EMPTY;

  const categoryNode =
    ctx.category ?? (ctx.current.kind === "category" ? ctx.current : undefined);
  const businessNode =
    ctx.ancestors.find((n) => n.kind === "business") ??
    (ctx.current.kind === "business" ? ctx.current : undefined);
  const productNode = ctx.current.kind === "product" ? ctx.current : undefined;

  const destination = nodeToSlot(destinationNode)!;
  const category = nodeToSlot(categoryNode);
  const business = nodeToSlot(businessNode);
  const product = nodeToSlot(productNode);

  const related = ctx.related
    .map(nodeToSlot)
    .filter((n): n is AluxContextSlot => Boolean(n));

  return {
    hasContext: true,
    region: nodeToSlot(ctx.region),
    destination,
    category,
    business,
    product,
    related,
    canonical: ctx.canonical,
    reason: buildReason({ destination, category, business, product }),
    origin: "live",
  };
}

function fromSession(snap: ReturnType<typeof useNavigationSession>): AluxContext {
  if (!snap || !snap.destination) return EMPTY;
  const destination = sessionSlot(snap.destination)!;
  const category = sessionSlot(snap.category);
  const business = sessionSlot(snap.business);
  const product = sessionSlot(snap.product);
  return {
    hasContext: true,
    region: sessionSlot(snap.region),
    destination,
    category,
    business,
    product,
    related: [],
    canonical: snap.canonical,
    reason: buildReason({ destination, category, business, product }),
    origin: "session",
  };
}

export function useAluxContext(): AluxContext {
  // H2·P5 · Hydration Consistency Fix.
  // El primer render (SSR y cliente) DEBE ser idéntico. Aunque el
  // Context Engine ya tenga un snapshot en memoria en el cliente al
  // montar (deep-link navegado previamente), leerlo en el
  // `useState` initializer diverge del SSR (`null`) y produce un
  // hydration mismatch en `AluxFloatingTrigger` (title/label).
  // Iniciamos siempre en `null` y sincronizamos en effect: la
  // suscripción ya emite el snapshot vigente inmediatamente.
  const [live, setLive] = useState<ResolvedContext | null>(null);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
    const current = getLatestResolvedContext();
    if (current) setLive(current);
    return subscribeResolvedContext(setLive);
  }, []);
  const session = useNavigationSession();

  // Antes de hidratar, devolvemos el mismo contexto vacío que el SSR
  // para garantizar markup determinista en el primer render.
  if (!hydrated) return EMPTY;

  if (live) {
    const built = fromLive(live);
    if (built.hasContext) return built;
  }
  return fromSession(session);
}
