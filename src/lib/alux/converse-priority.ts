/**
 * Prioridad de lectura de Alux sobre el CMS (módulo puro, sin red).
 *
 * Decide QUÉ contenido publicado lee Alux antes de contestar y cómo se
 * presentan los precios. Sustituye el corte alfabético que dejaba fuera a
 * las empresas al final del abecedario (p. ej. Zazil Tunich).
 *
 *  1. Lo pedido explícitamente (paradas o fichas seleccionadas) siempre entra.
 *  2. Coincidencia con lo que pregunta la persona (sin acentos, por palabras).
 *  3. Empresas con visibilidad contratada vigente (`alux_weight` del plan).
 *  4. Experiencias que se venden en línea.
 *  5. Calidad de la ficha (completa, verificada, responde rápido).
 *  6. Empates: turno justo del día (nunca orden alfabético).
 *
 * Precios: sólo experiencias y artesanías con venta en línea autorizada por
 * el administrador se venden en línea (misma regla de `canSellDirect`).
 * Cualquier otro precio capturado viaja como «Precio de referencia» y lo
 * cotiza el concierge.
 */
import { canSellDirect } from "@/lib/crm/closure-rules";
import {
  businessAllowsOnlineSale,
  type BusinessOnlineSales,
} from "@/lib/commerce/online-sales-rules";
import { normalizeText } from "./converse-contract";
import { meridaIsoDay } from "@/lib/visibility/commercial-slots";
import {
  ALUX_READING_QUALITY_MAX,
  fairTurnKey,
  qualityPoints,
} from "@/lib/visibility/profile-completeness";

/** Palabras sin tema (es/en) que no sirven para buscar en el CMS. */
const STOPWORDS = new Set(
  (
    "de la el los las un una unos unas que en y o a al del por para con sin me mi mis te tu tus se es son " +
    "hay algo algun alguna alguno quiero queremos quisiera busco buscamos buscando puedo podemos puedes " +
    "donde como cual cuales cuando cuanto cuanta mas muy ver hacer recomiendas recomienda recomiendame " +
    "recomendar recomendacion sugieres sugerencia conoces tienen tiene tienes hoy manana dia dias " +
    "lugar lugares opcion opciones cosa cosas ir vamos voy estoy estamos esta este esto estos estas ese esa " +
    "hola gracias favor porfa bueno buena buenos buenas mejor mejores cerca aqui alla nos les lo le su sus " +
    "the and for with what where want some can you are is of to in an do any near best good please " +
    "there have has get our we us my it this that"
  ).split(" "),
);

/** Máximo de palabras de búsqueda por mensaje. */
export const ALUX_MAX_SEARCH_TERMS = 8;

/** Plural simple: «hoteles» → «hotel», «bares» → «bar», «cenotes» → «cenote». */
function stem(word: string): string {
  if (word.length > 4 && /[lrndj]es$/.test(word)) return word.slice(0, -2);
  if (word.length > 4 && word.endsWith("s")) return word.slice(0, -1);
  return word;
}

/**
 * Palabras con tema del mensaje, sin acentos ni plurales simples.
 * Excluye nombres de destinos: no distinguen una opción de otra.
 */
export function extractSearchTerms(
  text: string | null | undefined,
  excluded: readonly string[] = [],
): string[] {
  if (!text) return [];
  const skip = new Set(
    excluded.flatMap((value) => normalizeText(value).split(/[\s-]+/)).filter(Boolean),
  );
  const out: string[] = [];
  for (const raw of normalizeText(text).split(/[\s-]+/)) {
    if (raw.length < 3 || STOPWORDS.has(raw) || skip.has(raw) || /^\d+$/.test(raw)) continue;
    const term = stem(raw);
    if (term.length < 3 || out.includes(term)) continue;
    out.push(term);
    if (out.length >= ALUX_MAX_SEARCH_TERMS) break;
  }
  return out;
}

/** Cuántas palabras de búsqueda aparecen en el texto (normalizado aquí). */
export function termHits(terms: readonly string[], text: string): number {
  if (terms.length === 0 || !text) return 0;
  const hay = normalizeText(text);
  return terms.reduce((sum, term) => sum + (hay.includes(term) ? 1 : 0), 0);
}

/** Peso Alux del plan de visibilidad vigente (0 = sin visibilidad contratada). */
export function aluxWeightFromLevers(levers: unknown): number {
  if (!levers || typeof levers !== "object") return 0;
  const n = Number((levers as Record<string, unknown>)["alux_weight"]);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Tope diario de menciones «Recomendado» del paquete (0 = sin tope). */
export function aluxDailyCap(levers: unknown): number {
  if (!levers || typeof levers !== "object") return 0;
  const n = Number((levers as Record<string, unknown>)["alux_daily_cap"]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/**
 * ¿Puede Alux marcar hoy a esta empresa como «Recomendado»? Sólo paquetes con
 * menciones proactivas (Premium, Élite) y mientras no lleguen a su tope del
 * día. Un paquete sin menciones proactivas (Destacado) sólo se lee primero.
 */
export function aluxCanPromote(levers: unknown, mentionsToday: number): boolean {
  if (aluxWeightFromLevers(levers) <= 0) return false;
  if (!levers || typeof levers !== "object") return false;
  if ((levers as Record<string, unknown>)["alux_proactive"] !== true) return false;
  const cap = aluxDailyCap(levers);
  return cap === 0 || mentionsToday < cap;
}

/** ¿La respuesta de Alux nombra este título? (sin acentos ni mayúsculas). */
export function replyMentions(reply: string, title: string): boolean {
  const name = normalizeText(title).trim();
  return name.length >= 3 && normalizeText(reply).includes(name);
}

export interface PrioritizeOptions<T> {
  readonly limit: number;
  readonly terms: readonly string[];
  readonly idOf: (row: T) => string;
  readonly textOf: (row: T) => string;
  readonly nameOf: (row: T) => string;
  /** Peso de visibilidad contratada (0 si no tiene). */
  readonly weightOf?: (row: T) => number;
  /** Puntos extra propios de la familia (p. ej. venta en línea). */
  readonly bonusOf?: (row: T) => number;
  /** Calidad 0–100 de la ficha (`aluxQualityScore`). */
  readonly qualityOf?: (row: T) => number;
  readonly requiredIds?: ReadonlySet<string>;
  /** Semilla del turno justo; por omisión, el día en Mérida. */
  readonly seed?: string;
}

/**
 * Elige hasta `limit` filas: obligatorias primero; después coincidencia con
 * la pregunta, visibilidad contratada, bono de familia y calidad de ficha;
 * los empates se turnan cada día.
 */
export function prioritizeRows<T>(rows: readonly T[], opts: PrioritizeOptions<T>): T[] {
  const seed = opts.seed ?? `alux:${meridaIsoDay()}`;
  const scored = rows.map((row) => {
    const weight = opts.weightOf?.(row) ?? 0;
    const score =
      termHits(opts.terms, opts.textOf(row)) * 100 +
      (weight > 0 ? 50 + Math.min(weight, 100) / 10 : 0) +
      (opts.bonusOf?.(row) ?? 0) +
      qualityPoints(opts.qualityOf?.(row), ALUX_READING_QUALITY_MAX);
    const id = opts.idOf(row);
    return {
      row,
      score,
      required: opts.requiredIds?.has(id) === true,
      turn: fairTurnKey(seed, id),
    };
  });
  scored.sort(
    (a, b) =>
      Number(b.required) - Number(a.required) ||
      b.score - a.score ||
      a.turn - b.turn ||
      opts.nameOf(a.row).localeCompare(opts.nameOf(b.row), "es"),
  );
  return scored.slice(0, Math.max(0, opts.limit)).map((s) => s.row);
}

export interface ProductOfferRow {
  readonly product_type?: unknown;
  readonly status?: unknown;
  readonly deleted_at?: unknown;
  readonly price_amount?: unknown;
  readonly price_currency?: unknown;
  readonly direct_sale_enabled?: unknown;
  readonly direct_sale_price_amount?: unknown;
  readonly direct_sale_currency?: unknown;
  readonly direct_sale_min_lead_hours?: unknown;
  readonly direct_sale_cancellation_policy?: unknown;
  readonly capacity?: unknown;
  /** Interruptor «Ventas en línea» de la empresa (sólo si está activado). */
  readonly online_sales?: BusinessOnlineSales | null;
}

/**
 * `true` sólo para productos publicados con venta en línea autorizada y precio
 * de venta. Experiencias, como siempre; tienda, pedidos, reservas y salidas
 * sólo si la empresa tiene «Ventas en línea» activada con Alux como canal.
 */
export function productSellsOnline(p: ProductOfferRow): boolean {
  const cents = Number(p.direct_sale_price_amount);
  const type = typeof p.product_type === "string" ? p.product_type : null;
  if (!type || !businessAllowsOnlineSale(p.online_sales ?? null, type, "alux_pagina")) return false;
  return canSellDirect({
    // Misma regla del CRM (publicado, autorizado, precio > 0) para todos los tipos.
    product_type: "experiencia",
    status: typeof p.status === "string" ? p.status : null,
    deleted_at: typeof p.deleted_at === "string" ? p.deleted_at : null,
    direct_sale_enabled: p.direct_sale_enabled === true,
    direct_sale_price_amount: Number.isFinite(cents) ? cents : null,
  });
}

function formatMoney(amount: number, currency: unknown): string | null {
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const cur =
    typeof currency === "string" && currency.length === 3 ? currency.toUpperCase() : "MXN";
  return `${amount.toLocaleString("es-MX", { maximumFractionDigits: 0 })} ${cur}`;
}

function oneLine(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.replace(/\s+/g, " ").trim();
  if (!text) return null;
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

export interface ProductOfferFacts {
  readonly facts: readonly string[];
  readonly hasPrice: boolean;
  readonly sellsOnline: boolean;
}

/**
 * Hechos de precio y compra de un producto, en el orden que Alux los cita.
 * Venta en línea ⇒ precio de venta, anticipación y cancelación.
 * Sin venta en línea ⇒ «Precio de referencia» que cotiza el concierge.
 */
export function productOfferFacts(p: ProductOfferRow): ProductOfferFacts {
  const facts: string[] = [];
  const sellsOnline = productSellsOnline(p);
  let hasPrice = false;
  if (sellsOnline) {
    const price = formatMoney(
      Number(p.direct_sale_price_amount) / 100,
      p.direct_sale_currency ?? p.price_currency,
    );
    if (price) {
      facts.push(`Se vende en línea en Valladolid.mx: ${price}`);
      hasPrice = true;
    }
  } else {
    const price = formatMoney(Number(p.price_amount), p.price_currency);
    if (price) {
      facts.push(`Precio de referencia: ${price} (no se vende en línea; lo cotiza el concierge)`);
      hasPrice = true;
    }
  }
  const capacity = Number(p.capacity);
  if (Number.isFinite(capacity) && capacity > 0)
    facts.push(`Cupo: hasta ${capacity} ${capacity === 1 ? "persona" : "personas"}`);
  if (sellsOnline) {
    const lead = Number(p.direct_sale_min_lead_hours);
    if (Number.isFinite(lead) && lead > 0) facts.push(`Reservar con ${lead} h de anticipación`);
    const cancel = oneLine(p.direct_sale_cancellation_policy, 90);
    if (cancel) facts.push(`Cancelación: ${cancel}`);
  }
  return { facts, hasPrice, sellsOnline };
}
