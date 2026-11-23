/**
 * profile-completeness.ts — «Tu ficha para Alux» (Fase A, módulo puro).
 *
 * Fuente única del avance de la ficha de una empresa y de la calidad que
 * Alux usa para recomendarla. No lee base de datos: recibe las señales de
 * la función `business_profile_signals` y devuelve la lista de pendientes
 * con el beneficio de cada uno.
 *
 * El pago sigue dando el primer lugar marcado «Recomendado» (sólo si
 * encaja); la calidad ordena lo que Alux lee y, entre opciones parecidas,
 * favorece fichas completas y empresas que responden rápido.
 */
import { stableHash } from "./commercial-slots";

export interface BusinessProfileSignals {
  readonly business_id: string;
  readonly has_cover: boolean;
  readonly gallery_count: number;
  readonly description_length: number;
  readonly hours_days: number;
  readonly has_location: boolean;
  readonly has_whatsapp: boolean;
  readonly has_google: boolean;
  readonly faq_count: number;
  readonly published_products: number;
  readonly sellable_experiences: number;
  readonly verified: boolean;
  readonly quotes_90d: number;
  readonly quotes_fast_90d: number;
}

export type ProfileItemId =
  | "fotos"
  | "descripcion"
  | "horario"
  | "ubicacion"
  | "whatsapp"
  | "google"
  | "preguntas"
  | "productos";

/** Pantallas del Portal donde se completa cada punto. */
export type ProfilePortalPath =
  | "/portal/galeria"
  | "/portal/ficha"
  | "/portal/presencia"
  | "/portal/whatsapp"
  | "/portal/catalogo";

export type ProfileItemStatus = "done" | "partial" | "missing";

export interface ProfileChecklistItem {
  readonly id: ProfileItemId;
  readonly label: string;
  readonly status: ProfileItemStatus;
  /** Puntos obtenidos y máximos (suman 100 entre todos). */
  readonly points: number;
  readonly maxPoints: number;
  /** Qué falta, en palabras de la empresa. */
  readonly missing: string | null;
  /** Qué gana la empresa al completarlo. */
  readonly benefit: string;
  /** Pantalla del Portal donde se completa (null = lo hace el equipo). */
  readonly portalPath: ProfilePortalPath | null;
}

export interface ProfileCompleteness {
  readonly percent: number;
  readonly items: readonly ProfileChecklistItem[];
  readonly pending: number;
}

/** Fotos de galería que cuentan como galería completa. */
export const GALLERY_TARGET = 4;
/** Letras mínimas para una descripción completa. */
export const DESCRIPTION_TARGET = 160;
/** Preguntas respondidas para completar el apartado. */
export const FAQ_TARGET = 3;

function n(value: unknown): number {
  const v = Number(value);
  return Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
}

function item(
  id: ProfileItemId,
  label: string,
  maxPoints: number,
  points: number,
  missing: string | null,
  benefit: string,
  portalPath: ProfilePortalPath | null,
): ProfileChecklistItem {
  const p = Math.max(0, Math.min(maxPoints, Math.round(points)));
  const status: ProfileItemStatus = p >= maxPoints ? "done" : p > 0 ? "partial" : "missing";
  return { id, label, status, points: p, maxPoints, missing: status === "done" ? null : missing, benefit, portalPath };
}

/** Lista de pendientes y porcentaje de la ficha. */
export function computeProfileCompleteness(s: BusinessProfileSignals): ProfileCompleteness {
  const gallery = n(s.gallery_count);
  const desc = n(s.description_length);
  const hours = Math.min(7, n(s.hours_days));
  const faqs = n(s.faq_count);
  const products = n(s.published_products);

  const photoPoints = (s.has_cover ? 8 : 0) + (Math.min(gallery, GALLERY_TARGET) / GALLERY_TARGET) * 12;
  const photoMissing = [
    s.has_cover ? null : "foto de portada",
    gallery >= GALLERY_TARGET
      ? null
      : `${GALLERY_TARGET - gallery} ${GALLERY_TARGET - gallery === 1 ? "foto" : "fotos"} de galería`,
  ]
    .filter(Boolean)
    .join(" y ");

  const items: ProfileChecklistItem[] = [
    item(
      "fotos",
      "Fotos",
      20,
      photoPoints,
      photoMissing ? `Agrega ${photoMissing}.` : null,
      "Con fotos reales tu tarjeta aparece completa en listados y Alux puede mostrarte con imagen.",
      "/portal/galeria",
    ),
    item(
      "descripcion",
      "Descripción",
      15,
      desc >= DESCRIPTION_TARGET ? 15 : desc >= 60 ? 7 : 0,
      desc === 0
        ? "Escribe qué te hace especial."
        : `Agrega unas ${Math.max(1, DESCRIPTION_TARGET - desc)} letras más.`,
      "Alux usa tu descripción para explicar por qué vale la pena visitarte.",
      "/portal/ficha",
    ),
    item(
      "horario",
      "Horario",
      15,
      hours >= 7 ? 15 : hours > 0 ? 8 : 0,
      hours === 0 ? "Agrega tu horario." : `Faltan ${7 - hours} ${7 - hours === 1 ? "día" : "días"} (marca también los días cerrados).`,
      "Agrega tu horario y Alux podrá recomendarte cuando pregunten qué está abierto.",
      "/portal/presencia",
    ),
    item(
      "ubicacion",
      "Ubicación en el mapa",
      15,
      s.has_location ? 15 : 0,
      "Coloca tu pin en el mapa.",
      "Con tu ubicación apareces en el mapa y Alux te sugiere a quien está cerca.",
      "/portal/presencia",
    ),
    item(
      "whatsapp",
      "WhatsApp",
      10,
      s.has_whatsapp ? 10 : 0,
      "Agrega tu número de WhatsApp.",
      "Los viajeros te escriben directo y el concierge te pide cotizaciones más rápido.",
      "/portal/presencia",
    ),
    item(
      "google",
      "Vínculo con Google",
      10,
      s.has_google ? 10 : 0,
      "El equipo de Valladolid.mx la vincula; revisa que tu nombre y dirección coincidan con Google Maps.",
      "Alux puede mostrar el resumen oficial de tus reseñas de Google.",
      null,
    ),
    item(
      "preguntas",
      "Preguntas y respuestas",
      10,
      faqs >= FAQ_TARGET ? 10 : faqs > 0 ? 5 : 0,
      `Responde ${Math.max(1, FAQ_TARGET - faqs)} ${FAQ_TARGET - faqs === 1 ? "pregunta" : "preguntas"} más.`,
      "Alux contesta por ti lo que más preguntan (estacionamiento, mascotas, reservas…).",
      "/portal/whatsapp",
    ),
    item(
      "productos",
      "Productos o experiencias",
      5,
      products > 0 ? 5 : 0,
      "Publica al menos un producto, habitación o experiencia.",
      "Alux puede proponer lo que ofreces dentro del viaje y el concierge cotizarlo.",
      "/portal/catalogo",
    ),
  ];
  const percent = items.reduce((sum, i) => sum + i.points, 0);
  return { percent, items, pending: items.filter((i) => i.status !== "done").length };
}

/**
 * Calidad para Alux (0–100): 70 % ficha completa, más verificación, rapidez
 * al responder cotizaciones y experiencias que se venden en línea.
 */
export function aluxQualityScore(s: BusinessProfileSignals | null | undefined): number {
  if (!s) return 0;
  const { percent } = computeProfileCompleteness(s);
  const quotes = n(s.quotes_90d);
  const fast = Math.min(quotes, n(s.quotes_fast_90d));
  const score =
    percent * 0.7 +
    (s.verified ? 10 : 0) +
    (quotes > 0 ? (fast / quotes) * 10 : 0) +
    (n(s.sellable_experiences) > 0 ? 10 : 0);
  return Math.max(0, Math.min(100, Math.round(score)));
}

/** Puntos de calidad en el orden de lectura de Alux (debajo del tema y del pago). */
export const ALUX_READING_QUALITY_MAX = 25;
/** Puntos de calidad al elegir qué recomendar (similar a «ideal en pareja»). */
export const ALUX_RANKING_QUALITY_MAX = 8;

export function qualityPoints(quality: number | null | undefined, max: number): number {
  const q = Number(quality);
  if (!Number.isFinite(q) || q <= 0) return 0;
  return Math.round((Math.min(100, q) / 100) * max);
}

/**
 * Turno justo entre empates: orden estable durante el día que cambia cada
 * día, para que no salgan siempre las mismas ni por orden alfabético.
 */
export function fairTurnKey(seed: string, id: string): number {
  return stableHash(`${seed}:${id}`);
}
