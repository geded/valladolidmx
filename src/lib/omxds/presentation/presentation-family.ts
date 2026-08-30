/**
 * G8-R1-F1C-A · Resolución automática de familia de presentación (capa PURA).
 *
 * Extiende el resolutor canónico acreditado (G8-R1-C) con las familias que la
 * Autorización Founder convierte en autoridad funcional:
 *  - `vacation_rental` (contrato y JSON-LD propios, distinto de hotel)
 *  - `business_generic` (empresa turística que no es hotel ni restaurante)
 *  - `product_generic` (producto que no es experiencia ni tour)
 *
 * Orden obligatorio, sin excepciones:
 *   override aprobado compatible → preset canónico de familia → estándar fail-closed
 *
 * Nunca se usa un preset genérico para ocultar una clasificación desconocida:
 * una categoría o `product_type` no reconocido resuelve a superficie estándar
 * con diagnóstico de desarrollo.
 */
import {
  resolveCanonicalEntityTemplate,
  type CanonicalEntityResolutionInput,
} from "@/lib/experience-builder/canonical-entity-resolver";
import type { PresentationFamily } from "./entity-presentation";

export const PRESENTATION_FAMILY_CONTRACT_VERSION = "1.0.0" as const;

export interface PresentationFamilyResolution {
  readonly family: PresentationFamily | null;
  readonly source: "override" | "family" | "standard";
  /** `true` cuando la clasificación es desconocida (estándar fail-closed). */
  readonly unknownClassification: boolean;
  readonly reason: string;
  readonly variant: string | null;
  readonly devWarning: string | null;
}

/** Empresas turísticas acreditadas que no son hotel ni restaurante. */
const GENERIC_BUSINESS_CATEGORIES = new Set([
  "tour-operador",
  "operador-turistico",
  "agencia-de-viajes",
  "transporte",
  "guia-turistico",
  "spa",
  "artesanias",
  "comercio",
  "servicios-turisticos",
]);

function normalize(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase().replace(/_/g, "-");
}

export function resolvePresentationFamily(
  input: CanonicalEntityResolutionInput,
): PresentationFamilyResolution {
  const base = resolveCanonicalEntityTemplate(input);

  if (base.canonicalFamily && base.canonicalFamily !== "product_generic") {
    return {
      family: base.canonicalFamily as PresentationFamily,
      source: base.source === "override" ? "override" : "family",
      unknownClassification: false,
      reason: base.reason,
      variant: base.variant,
      devWarning: base.devWarning,
    };
  }

  const kind = normalize(input.entityType);

  if (base.canonicalFamily === "product_generic") {
    return {
      family: "product_generic",
      source: "family",
      unknownClassification: false,
      reason: "producto genérico con identidad propia",
      variant: null,
      devWarning: null,
    };
  }

  if (kind === "business") {
    const category = normalize(input.categorySlug);
    if (GENERIC_BUSINESS_CATEGORIES.has(category)) {
      return {
        family: "business_generic",
        source: "family",
        unknownClassification: false,
        reason: "empresa turística genérica con categoría acreditada",
        variant: category,
        devWarning: null,
      };
    }
    return {
      family: null,
      source: "standard",
      unknownClassification: true,
      reason: "categoría no reconocida (estándar fail-closed)",
      variant: null,
      devWarning: `[G8-R1-F1C-A] categoría de empresa no reconocida para ${input.entityId}: "${category || "-"}"`,
    };
  }

  return {
    family: null,
    source: "standard",
    unknownClassification: true,
    reason: base.reason,
    variant: base.variant,
    devWarning:
      base.devWarning ??
      `[G8-R1-F1C-A] clasificación no reconocida para ${input.entityId} (${kind || "-"})`,
  };
}
