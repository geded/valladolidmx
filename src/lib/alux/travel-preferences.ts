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
import { openAluxFloating, type AluxOpenSelection } from "./floating-bus";
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
    match: /\b(en\s+pareja|parejas?)\b/i,
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
    match: /\b(cenote|naturaleza|selva|aves)\b/i,
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
  {
    slug: "vida-nocturna",
    label: "Vida nocturna",
    phrase: "buscan vida nocturna",
    match: /\b(vida\s+nocturna|noche|nocturn|bar(es)?|antro|fiesta)\b/i,
  },
  {
    slug: "romance",
    label: "Romance",
    phrase: "viajan por romance",
    match: /\b(romance|rom[aá]ntic|luna\s+de\s+miel|aniversario)\b/i,
  },
  {
    slug: "aventura",
    label: "Aventura",
    phrase: "buscan aventura",
    match: /\b(aventura|tirolesa|rapel|kayak|bici|ciclis|senderis)\b/i,
  },
  {
    slug: "bienestar",
    label: "Bienestar / Wellness",
    phrase: "buscan bienestar",
    match: /\b(bienestar|wellness|temazcal|yoga|masaje)\b/i,
  },
  {
    slug: "ecoturismo",
    label: "Ecoturismo",
    phrase: "buscan ecoturismo y conservación",
    match: /\b(ecoturis|conservaci[oó]n|reserva\s+natural|avistamiento)\b/i,
  },
  {
    slug: "turismo-rural",
    label: "Turismo rural",
    phrase: "buscan turismo rural y comunitario",
    match: /\b(rural|comunitari|pueblo|milpa|rancho|hacienda)\b/i,
  },
  {
    slug: "turismo-salud",
    label: "Salud",
    phrase: "viajan por motivos de salud",
    match: /\b(salud|m[eé]dic|cl[ií]nic|dental|tratamiento)\b/i,
  },
  {
    slug: "estilo-mochilero",
    label: "Mochilero",
    phrase: "viajan en estilo mochilero",
    match: /\b(mochiler|backpack|hostal|hostel)\b/i,
  },
  {
    slug: "viaje-con-mascotas",
    label: "Viajo con mascotas",
    phrase: "viajan con mascotas",
    match: /\b(mascota|perro|gato|pet\s*friendly)\b/i,
  },
  {
    slug: "artesanias-compras",
    label: "Artesanías y compras",
    phrase: "les interesan las artesanías y las compras",
    match: /\b(artesan|compras|mercado|bordad|hamaca)\b/i,
  },
  {
    slug: "fiestas-eventos",
    label: "Fiestas y eventos",
    phrase: "buscan fiestas y eventos",
    match: /\b(evento|festival|feria|concierto|vaquer)\b/i,
  },
  {
    slug: "fotografia",
    label: "Fotografía",
    phrase: "viajan por la fotografía",
    match: /\b(fotograf|foto|paisaj)\b/i,
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

/**
 * Invocación de Alux con memoria de preferencias: registra lo que el
 * viajero acaba de marcar y añade al contexto lo ya recordado, sin crear
 * un segundo bus ni un segundo motor de conversación.
 */
export function askAluxWithPreferenceMemory(input: {
  readonly surface: string;
  readonly hint: string;
  readonly prompt?: string | undefined;
  readonly selection?: AluxOpenSelection | undefined;
}): void {
  if (input.prompt) rememberTravelPreference(input.prompt, input.surface);
  const line = travelPreferenceContextLine();
  openAluxFloating({
    reason: "manual",
    hint: line ? `${input.hint} ${line}` : input.hint,
    ...(input.prompt ? { prompt: input.prompt } : {}),
    ...(input.selection ? { selection: input.selection } : {}),
  });
}
