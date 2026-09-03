/**
 * Fixtures de revisión de filtros de Lugares — SÓLO superficies internas
 * `/lovable/*` (noindex).
 *
 * Regla vinculante: estos valores son datos de prueba y jamás se escriben en
 * la base ni se exponen en lecturas públicas. Sirven exclusivamente para que
 * el Founder pueda validar que los filtros profesionales muestran opciones,
 * conteos y filtran realmente las tarjetas. Se aplican en memoria sobre el
 * DTO ya construido, después de las lecturas reales.
 */
import type { TourismCardVM } from "@/components/experience-builder/tourism-card/TourismCard";
import type { PublicListingDTO } from "@/lib/listings/listing-public-contract";

export const PLACE_REVIEW_FIXTURE_NOTICE =
  "Datos de prueba: entrada, tiempo de visita, accesibilidad y naturaleza o gestión son valores provisionales para revisar los filtros.";

type FixtureAttrs = Record<string, string[]>;

/** Clasificaciones provisionales DEMO por slug canónico del lugar. */
const FIXTURES: Record<string, FixtureAttrs> = {
  "calzada-de-los-frailes": {
    admission_type: ["gratuito"],
    duration: ["hasta-1-hora"],
    accessibility: ["ruta-a-pie", "apta-para-carriola"],
    authority_kind: ["patrimonio-municipal"],
  },
  "convento-san-bernardino": {
    admission_type: ["donativo"],
    duration: ["hasta-1-hora"],
    accessibility: ["acceso-en-planta-baja"],
    authority_kind: ["patrimonio-religioso"],
  },
  "cenote-zaci": {
    admission_type: ["pago"],
    duration: ["1-2-horas"],
    accessibility: ["escaleras-empinadas"],
    authority_kind: ["gestion-municipal"],
  },
  "cenote-suytun": {
    admission_type: ["pago"],
    duration: ["1-2-horas"],
    accessibility: ["escaleras-empinadas"],
    authority_kind: ["gestion-privada"],
  },
  "cenote-ik-kil": {
    admission_type: ["pago"],
    duration: ["media-jornada"],
    accessibility: ["escaleras-empinadas", "vestidores"],
    authority_kind: ["gestion-privada"],
  },
  "chichen-itza": {
    admission_type: ["pago"],
    duration: ["dia-completo"],
    accessibility: ["senderos-amplios"],
    authority_kind: ["gestion-federal"],
  },
  "ek-balam": {
    admission_type: ["pago"],
    duration: ["media-jornada"],
    accessibility: ["senderos-amplios"],
    authority_kind: ["gestion-estatal"],
  },
};

function slugOf(card: TourismCardVM): string | null {
  const href = card.href ?? "";
  const parts = href.split("/").filter(Boolean);
  return parts.length ? (parts[parts.length - 1] ?? null) : null;
}

/** Devuelve una copia de la tarjeta con los atributos DEMO combinados. */
export function withPlaceReviewFixtures(card: TourismCardVM): TourismCardVM {
  const slug = slugOf(card);
  const extra = slug ? FIXTURES[slug] : undefined;
  if (!extra) return card;
  const current = (card.filterAttributes ?? {}) as Record<string, unknown>;
  const merged: Record<string, unknown> = { ...current };
  for (const [key, values] of Object.entries(extra)) {
    if (merged[key] == null || (Array.isArray(merged[key]) && (merged[key] as unknown[]).length === 0)) {
      merged[key] = values;
    }
  }
  return { ...card, filterAttributes: merged as TourismCardVM["filterAttributes"] };
}

export function applyPlaceReviewFixtures(items: readonly TourismCardVM[]): TourismCardVM[] {
  return items.map(withPlaceReviewFixtures);
}

export function listingWithPlaceReviewFixtures(dto: PublicListingDTO): PublicListingDTO {
  return { ...dto, items: applyPlaceReviewFixtures(dto.items) };
}
