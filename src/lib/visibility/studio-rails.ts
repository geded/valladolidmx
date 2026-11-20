/**
 * studio-rails.ts — Puente declarativo entre el Studio Standard v1.0 y el
 * reparto de presencia comercial.
 *
 * E4 del Studio Standard: la visibilidad contratada deja de depender de
 * listas sueltas por superficie y pasa a leer los carriles que cada plantilla
 * oficial DECLARA (`commercialSlots: true` en `composite-sections.ts` o en
 * `SURFACE_SLOT_REGISTRY`).
 *
 * Capa PURA: no lee base de datos, no renderiza, no cambia el diseño público.
 * Fail-closed: si la plantilla o el carril no están declarados, el carril se
 * sirve 100% orgánico — nunca se inventa presencia contratada.
 *
 * Las reglas de reparto (bloque de 4, prioridad contratada, techos por
 * empresa, rotación determinista, sin relleno con fixtures) siguen viviendo
 * en `commercial-slots.ts`, que continúa siendo la única autoridad de cálculo.
 */
import { commercialRailsForTemplate } from "@/lib/experience-builder/studio-standard";
import {
  allocateSlots,
  dailySeed,
  type AllocatedSlot,
  type SlotCandidate,
  type SponsoredCandidate,
} from "./commercial-slots";

/** Carriles de la plantilla que admiten presencia contratada. */
export function commercialRails(templateKey: string | null): readonly string[] {
  if (!templateKey) return [];
  return commercialRailsForTemplate(templateKey);
}

/** `true` sólo si la plantilla declara ese carril como espacio comercial. */
export function railAcceptsSponsored(
  templateKey: string | null,
  railKey: string,
): boolean {
  if (!templateKey || !railKey) return false;
  return commercialRails(templateKey).includes(railKey);
}

/** Contador compartido de apariciones por empresa dentro de una misma página. */
export function createPageAppearances(): Map<string, number> {
  return new Map<string, number>();
}

export interface AllocateRailOptions {
  /** Familia de plantilla declarada (p. ej. `vmx.home.premium-g4`). */
  templateKey: string | null;
  /** Clave de la sección/carril tal como la declara la plantilla. */
  railKey: string;
  /** Tarjetas visibles del carril. */
  total: number;
  organic: SlotCandidate[];
  sponsored?: SponsoredCandidate[];
  /** Día en el destino (`America/Merida`) en formato ISO `YYYY-MM-DD`. */
  isoDay: string;
  /** Contador compartido de la página, para el techo de 2 por empresa. */
  pageAppearances?: Map<string, number>;
}

/**
 * Reparte un carril leyendo la declaración de la plantilla. La semilla de
 * rotación se deriva del día y del carril declarado, de modo que el orden es
 * estable durante el día y distinto entre carriles y superficies.
 */
export function allocateRailSlots(options: AllocateRailOptions): AllocatedSlot[] {
  const declared = railAcceptsSponsored(options.templateKey, options.railKey);
  return allocateSlots({
    total: options.total,
    organic: options.organic,
    sponsored: declared ? (options.sponsored ?? []) : [],
    seed: dailySeed(`${options.templateKey ?? "undeclared"}:${options.railKey}`, options.isoDay),
    pageAppearances: options.pageAppearances,
  });
}
