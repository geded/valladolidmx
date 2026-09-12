/**
 * Preferencias de viaje declaradas en las superficies (chips de Alux).
 *
 * NO crea un almacén paralelo: traduce la opción que el viajero marca
 * («En pareja», «Con niños», «Cenotes»…) a una señal permitida
 * `category_explored` del contrato existente y la registra con el emisor
 * único (`signal-emitter`). Así queda en la memoria funcional local de
 * Alux (`memory-store`), caduca a los 30 días, respeta la pausa de
 * personalización y viaja a la cuenta con el resumen permitido.
 *
 * Vocabulario CERRADO: cualquier texto que no coincida se descarta
 * (fail-closed, cero texto libre, cero PII).
 */
import { emitAluxSignal } from "./signal-emitter";
import { getAluxSignalSummary } from "./memory-store";
import type { AluxSignalSummary } from "./behavior-signals";

export interface TravelPreference {
  /** Slug canónico usado como clave de señal. */
  readonly slug: string;
  /** Etiqueta legible para el viajero. */
  readonly label: string;
  /** Frase que Alux y las superficies usan al explicar la recomendación. */
  readonly phrase: string;
  readonly match: RegExp;
}

export const TRAVEL_PREFERENCE_VOCABULARY: readonly TravelPreference[] = [
  {
    slug: "viaje-en-pareja",
    label: "En pareja",
    phrase: "viajan en pareja",
    match: /\b(en\s+pareja|parejas?|romántic|romantic|luna\s+de\s+miel)\b/i,
  },
  {
    slug: "viaje-en-familia",
    label: "En familia",
    phrase: "viajan en familia",
    match: /\b(en\s+familia|familiar|con\s+niñ|con\s+hijos)\b/i,
  },
  {
    slug: "viaje-con-amigos",
    label: "Con amigos",
    phrase: "viajan con amigos",
    match: /\b(con\s+amigos|grupo\s+de\s+amigos|en\s+grupo)\b/i,
  },
  {
    slug: "viaje-en-solitario",
    label: "Viajo solo",
    phrase: "viajan en solitario",
    match: /\b(solo|sola|en\s+solitario)\b/i,
  },
  {
    slug: "viaje-accesible",
    label: "Accesible",
    phrase: "necesitan opciones accesibles",
    match: /\b(accesib|silla\s+de\s+ruedas|movilidad)\b/i,
  },
  {
    slug: "presupuesto-economico",
    label: "Económico",
    phrase: "cuidan el presupuesto",
    match: /\b(econ[oó]mic|barat|bajo\s+presupuesto)\b/i,
  },
  {
    slug: "experiencia-premium",
    label: "Premium",
    phrase: "buscan una experiencia premium",
    match: /\b(premium|boutique|lujo|exclusiv)\b/i,
  },
  {
    slug: "gastronomia",
    label: "Gastronomía",
    phrase: "les interesa la gastronomía",
    match: /\b(gastronom|comida|cocina|cena|restaurante)\b/i,
  },
  {
    slug: "cenotes-naturaleza",
    label: "Cenotes y naturaleza",
    phrase: "buscan cenotes y naturaleza",
    match: /\b(cenote|naturaleza|selva|aves|ecotur)\b/i,
  },
  {
    slug: "cultura-maya",
    label: "Cultura maya",
    phrase: "les interesa la cultura maya",
    match: /\b(maya|arqueol|historia|cultura|patrimonio)\b/i,
  },
  {
    slug: "descanso",
    label: "Descanso",
    phrase: "buscan descanso",
    match: /\b(descans|relaj|piscina|spa|tranquil)\b/i,
  },
  {
    slug: "centro-historico",
    label: "Cerca del centro",
    phrase: "prefieren estar cerca del centro",
    match: /\b(centro|c[eé]ntric|caminar)\b/i,
  },
];

const BY_SLUG = new Map(TRAVEL_PREFERENCE_VOCABULARY.map((p) => [p.slug, p]));

/** Traduce el texto de una opción marcada a su preferencia canónica. */
export function normalizeTravelPreference(raw: string | null | undefined): TravelPreference | null {
  const text = (raw ?? "").trim();
  if (!text) return null;
  for (const preference of TRAVEL_PREFERENCE_VOCABULARY) {
    if (preference.match.test(text)) return preference;
  }
  return null;
}

/** Todas las preferencias reconocidas dentro de un texto compuesto. */
export function extractTravelPreferences(raw: string | null | undefined): TravelPreference[] {
  const text = (raw ?? "").trim();
  if (!text) return [];
  return TRAVEL_PREFERENCE_VOCABULARY.filter((preference) => preference.match.test(text));
}

/**
 * Registra la preferencia marcada como señal permitida. Silencioso y
 * no bloqueante: si la personalización está pausada no hace nada.
 */
export function rememberTravelPreference(raw: string | null | undefined, surface: string): void {
  if (typeof window === "undefined") return;
  for (const preference of extractTravelPreferences(raw)) {
    void emitAluxSignal({
      kind: "category_explored",
      key: preference.slug,
      purpose: "personalization",
      context: {
        isAuthenticated: false,
        surface,
        route: window.location.pathname,
      },
    });
  }
}

/** Preferencias recordadas, de mayor a menor afinidad. */
export function readTravelPreferences(summary?: AluxSignalSummary): TravelPreference[] {
  const source = summary ?? (typeof window === "undefined" ? null : getAluxSignalSummary());
  if (!source || !source.enabled) return [];
  return Object.entries(source.categoryAffinity)
    .filter(([slug]) => BY_SLUG.has(slug))
    .sort((a, b) => b[1] - a[1])
    .map(([slug]) => BY_SLUG.get(slug)!)
    .slice(0, 4);
}

/**
 * Frase legible que las superficies añaden al contexto de Alux para que
 * siga recomendando con la misma intención en todo el territorio.
 */
export function travelPreferenceContextLine(summary?: AluxSignalSummary): string {
  const preferences = readTravelPreferences(summary);
  if (!preferences.length) return "";
  return `Contexto recordado de este viajero: ${preferences
    .map((preference) => preference.phrase)
    .join("; ")}. Tenlo en cuenta al recomendar.`;
}
