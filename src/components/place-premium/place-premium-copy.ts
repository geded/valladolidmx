/**
 * G8-Q2D-C · Textos editables de la ficha `premium-entity-place`.
 *
 * Módulo PURO (sin red, sin React, sin flags). Expone los encabezados que
 * hasta ahora vivían fijos en `PlacePremiumSurface` para que el Experience
 * Builder pueda ajustarlos desde el bloque oficial
 * `vmx.place.premium-q2d`, SIN crear una plantilla paralela.
 *
 * Reglas:
 *  - Fail-closed: cualquier campo ausente, vacío o no textual conserva el
 *    texto aprobado por el Founder (los defaults de este módulo son
 *    exactamente los que hoy se renderizan).
 *  - Token único `{lugar}` → nombre real del lugar.
 *  - Ningún texto nuevo se inventa: sólo se vuelven editables los actuales.
 */

export interface PlacePremiumCopy {
  readonly galleryHeading: string;
  readonly servicesKicker: string;
  readonly servicesTitle: string;
  readonly experiencesKicker: string;
  readonly experiencesTitle: string;
  readonly eventsKicker: string;
  readonly eventsTitle: string;
  readonly nearbyBusinessesHeading: string;
  readonly nearbyBusinessesSubheading: string;
  readonly nearbyGroupComer: string;
  readonly nearbyGroupDormir: string;
  readonly nearbyGroupHacer: string;
  readonly nearbyGroupComprar: string;
  readonly nearbyGroupOtros: string;
  readonly nearbyPlacesKicker: string;
  readonly nearbyPlacesTitle: string;
}

/** Textos aprobados vigentes (autoridad visual G8-Q2D-0). */
export const PLACE_PREMIUM_COPY_DEFAULTS: PlacePremiumCopy = {
  galleryHeading: "Conoce {lugar}",
  servicesKicker: "Servicios",
  servicesTitle: "Servicios disponibles",
  experiencesKicker: "Planea tu visita",
  experiencesTitle: "Experiencias y tours relacionados",
  eventsKicker: "Agenda",
  eventsTitle: "Eventos relacionados",
  nearbyBusinessesHeading: "Qué hay cerca de {lugar}",
  nearbyBusinessesSubheading:
    "Lugares para comer, dormir y seguir explorando a pocos pasos, según su ubicación real.",
  nearbyGroupComer: "Dónde comer",
  nearbyGroupDormir: "Dónde dormir",
  nearbyGroupHacer: "Qué hacer",
  nearbyGroupComprar: "Compras y artesanía",
  nearbyGroupOtros: "Más cerca de aquí",
  nearbyPlacesKicker: "Alrededor",
  nearbyPlacesTitle: "Lugares cercanos",
};

/** Campo de configuración del bloque por cada texto editable. */
export const PLACE_PREMIUM_COPY_FIELDS: Readonly<Record<keyof PlacePremiumCopy, string>> = {
  galleryHeading: "copy_gallery_heading",
  servicesKicker: "copy_services_kicker",
  servicesTitle: "copy_services_title",
  experiencesKicker: "copy_experiences_kicker",
  experiencesTitle: "copy_experiences_title",
  eventsKicker: "copy_events_kicker",
  eventsTitle: "copy_events_title",
  nearbyBusinessesHeading: "copy_nearby_businesses_heading",
  nearbyBusinessesSubheading: "copy_nearby_businesses_subheading",
  nearbyGroupComer: "copy_nearby_group_comer",
  nearbyGroupDormir: "copy_nearby_group_dormir",
  nearbyGroupHacer: "copy_nearby_group_hacer",
  nearbyGroupComprar: "copy_nearby_group_comprar",
  nearbyGroupOtros: "copy_nearby_group_otros",
  nearbyPlacesKicker: "copy_nearby_places_kicker",
  nearbyPlacesTitle: "copy_nearby_places_title",
};

const MAX_LENGTH = 160;

function sanitize(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (trimmed.length === 0) return fallback;
  return trimmed.slice(0, MAX_LENGTH);
}

/**
 * Resuelve los textos de la ficha desde la configuración del bloque
 * publicada en el constructor. Fail-closed campo por campo.
 */
export function resolvePlacePremiumCopy(
  config: Record<string, unknown> | null | undefined,
): PlacePremiumCopy {
  const cfg = config ?? {};
  const entries = Object.entries(PLACE_PREMIUM_COPY_FIELDS) as Array<
    [keyof PlacePremiumCopy, string]
  >;
  const resolved = { ...PLACE_PREMIUM_COPY_DEFAULTS } as Record<keyof PlacePremiumCopy, string>;
  for (const [key, field] of entries) {
    resolved[key] = sanitize(cfg[field], PLACE_PREMIUM_COPY_DEFAULTS[key]);
  }
  return resolved as PlacePremiumCopy;
}

/** Sustituye el token `{lugar}` por el nombre real del lugar. */
export function fillPlaceCopy(template: string, placeName: string): string {
  return template.replaceAll("{lugar}", placeName);
}

/** Configuración inicial de textos al crear el bloque en el constructor. */
export function placePremiumCopyDefaultConfig(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, field] of Object.entries(PLACE_PREMIUM_COPY_FIELDS) as Array<
    [keyof PlacePremiumCopy, string]
  >) {
    out[field] = PLACE_PREMIUM_COPY_DEFAULTS[key];
  }
  return out;
}
