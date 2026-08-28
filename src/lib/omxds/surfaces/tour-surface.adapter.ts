/**
 * G8-P2 · Adaptador semántico de la familia Tour.
 *
 * Reutiliza el motor visual aprobado de Experiencia, pero declara su
 * propio contrato semántico: itinerario, paradas, punto de salida,
 * idiomas, transporte, dificultad, capacidad y política de cancelación.
 * JSON-LD canónico: `TouristTrip`.
 */
import {
  createProductVerticalSurfaceContract,
  type ProductSurfaceContractInput,
  type ProductSurfaceProvenanceKind,
} from "./product-surface.contract";
import type { OmxdsSurfaceContract } from "./surface-contract";

const TOUR_PRODUCT_TYPES = new Set(["tour", "tours", "recorrido", "recorridos"]);

export const TOUR_SURFACE_JSON_LD_TYPE = "TouristTrip" as const;

export interface TourSurfaceSemantics {
  /** Itinerario ordenado (etapas del recorrido). */
  itinerary: readonly string[];
  /** Paradas declaradas. */
  stops: readonly string[];
  /** Duración legible. */
  duration: string | null;
  /** Punto de salida. */
  departurePoint: string | null;
  /** Idiomas ofrecidos. */
  languages: readonly string[];
  /** Transporte incluido. */
  transport: string | null;
  includes: readonly string[];
  excludes: readonly string[];
  difficulty: string | null;
  accessibility: string | null;
  capacity: number | null;
  cancellationPolicy: string | null;
}

export function isTourSurfaceProductType(productType: string): boolean {
  return TOUR_PRODUCT_TYPES.has(productType.trim().toLowerCase());
}

/** Contrato de superficie del tour (fail-closed por `product_type`). */
export function adaptTourSurfaceContract(
  input: ProductSurfaceContractInput,
  provenanceKind: ProductSurfaceProvenanceKind = "governed_source",
): OmxdsSurfaceContract | null {
  if (!isTourSurfaceProductType(input.productType)) return null;
  return createProductVerticalSurfaceContract(input, "experience", provenanceKind);
}

/** Normaliza la semántica del tour sin inventar datos ausentes. */
export function createTourSurfaceSemantics(
  partial: Partial<TourSurfaceSemantics> = {},
): TourSurfaceSemantics {
  const list = (value: readonly string[] | undefined) =>
    (value ?? []).map((v) => v.trim()).filter(Boolean);
  const text = (value: string | null | undefined) => {
    const v = (value ?? "").trim();
    return v.length > 0 ? v : null;
  };
  return {
    itinerary: list(partial.itinerary),
    stops: list(partial.stops),
    duration: text(partial.duration),
    departurePoint: text(partial.departurePoint),
    languages: list(partial.languages),
    transport: text(partial.transport),
    includes: list(partial.includes),
    excludes: list(partial.excludes),
    difficulty: text(partial.difficulty),
    accessibility: text(partial.accessibility),
    capacity:
      typeof partial.capacity === "number" && Number.isFinite(partial.capacity)
        ? partial.capacity
        : null,
    cancellationPolicy: text(partial.cancellationPolicy),
  };
}
