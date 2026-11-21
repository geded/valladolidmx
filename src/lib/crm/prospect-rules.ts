/**
 * CRM Prospectos · reglas puras (Fase 1, propuesta 19.48).
 *
 * Fuente única de las etapas del embudo, la temperatura, la normalización
 * del WhatsApp y la decisión de cuándo Alux ofrece dejar nombre y WhatsApp.
 * Sin dependencias de servidor ni de navegador: lo usan el servidor de
 * Alux, la tarjeta de contacto y el panel del concierge.
 */

export const PROSPECT_STAGES = [
  "nuevo",
  "contactado",
  "propuesta_enviada",
  "reservo",
  "por_viajar",
  "viajo",
  "posventa",
  "no_interesado",
  "perdido",
] as const;
export type ProspectStage = (typeof PROSPECT_STAGES)[number];

export const PROSPECT_STAGE_LABEL: Record<ProspectStage, string> = {
  nuevo: "Nuevo",
  contactado: "Contactado",
  propuesta_enviada: "Propuesta enviada",
  reservo: "Reservó",
  por_viajar: "Por viajar",
  viajo: "Viajó",
  posventa: "Posventa",
  no_interesado: "No interesado",
  perdido: "Perdido",
};

/** Etapas del embudo principal, en orden; las demás se muestran aparte. */
export const PROSPECT_FUNNEL_STAGES: readonly ProspectStage[] = [
  "nuevo",
  "contactado",
  "propuesta_enviada",
  "reservo",
  "por_viajar",
  "viajo",
  "posventa",
];
export const PROSPECT_CLOSED_STAGES: readonly ProspectStage[] = ["no_interesado", "perdido"];

export const PROSPECT_TEMPERATURES = ["frio", "tibio", "caliente"] as const;
export type ProspectTemperature = (typeof PROSPECT_TEMPERATURES)[number];
export const PROSPECT_TEMPERATURE_LABEL: Record<ProspectTemperature, string> = {
  frio: "Frío",
  tibio: "Tibio",
  caliente: "Caliente",
};

export const CONTACT_OFFER_REASONS = [
  "concierge",
  "booking",
  "price",
  "itinerary",
  "followup",
] as const;
export type ContactOfferReason = (typeof CONTACT_OFFER_REASONS)[number];

export const CONTACT_OFFER_REASON_LABEL: Record<ContactOfferReason, string> = {
  concierge: "Pidió hablar con un concierge",
  booking: "Quiere reservar o comprar",
  price: "Preguntó precios o cotización",
  itinerary: "Quiere su itinerario completo",
  followup: "Plática avanzada",
};

/** Máximo de veces que Alux ofrece dejar datos en una misma plática (regla de Zazil). */
export const MAX_CONTACT_OFFERS_PER_SESSION = 2;
/** Mensajes mínimos entre el primer y el segundo ofrecimiento. */
export const MIN_MESSAGES_BETWEEN_OFFERS = 3;
/** Mensajes previos tras los cuales se ofrece seguimiento aunque no haya pedido explícito. */
export const FOLLOWUP_OFFER_AFTER_MESSAGES = 4;

const CONCIERGE_RE =
  /\b(concierge|asesor|asesora|asesoría|humano|una persona|alguien real|hablar con alguien|agente humano|human|real person|someone)\b/i;
const BOOKING_RE =
  /\b(reserv\w*|apart(ar|o|ame)|compr(ar|o|arlo|arla)|pag(ar|o)|paquete|paquetes|book\w*|buy|package)\b/i;
const PRICE_RE =
  /(\bprecios?\b|cu[aá]nto (cuesta|sale|cobran|es)|\bcostos?\b|\bcotiza\w*|\btarifas?\b|\bprices?\b|\bcost\b|\bquote\b|how much)/i;
const ITINERARY_RE =
  /(\bitinerario\b|arm(a|ar|ame|en) (mi|el|un|nuestro) viaje|plan completo|plan de viaje|\bitinerary\b|plan (my|our) trip)/i;

export interface ContactOfferInput {
  /** El explorador ya inició sesión: su seguimiento vive en CRM Arma tu viaje. */
  readonly authenticated: boolean;
  /** La plática ya está ligada a un prospecto. */
  readonly alreadyProspect: boolean;
  readonly offerCount: number;
  /** Número de mensajes de la plática cuando se ofreció la última vez. */
  readonly lastOfferMessageCount: number | null;
  /** Mensajes previos de la plática (sin contar el actual). */
  readonly messageCount: number;
  readonly message: string;
  readonly asksPrice?: boolean;
}

/**
 * Decide si en esta respuesta Alux ofrece dejar nombre y WhatsApp.
 * Nunca bloquea la ayuda: sólo agrega la tarjeta. Máximo dos veces por plática.
 */
export function decideContactOffer(input: ContactOfferInput): ContactOfferReason | null {
  if (input.authenticated || input.alreadyProspect) return null;
  if (input.offerCount >= MAX_CONTACT_OFFERS_PER_SESSION) return null;
  if (
    input.offerCount > 0 &&
    input.lastOfferMessageCount !== null &&
    input.messageCount - input.lastOfferMessageCount < MIN_MESSAGES_BETWEEN_OFFERS
  ) {
    return null;
  }
  const text = input.message ?? "";
  if (CONCIERGE_RE.test(text)) return "concierge";
  if (BOOKING_RE.test(text)) return "booking";
  if (input.asksPrice || PRICE_RE.test(text)) return "price";
  if (ITINERARY_RE.test(text)) return "itinerary";
  if (input.offerCount === 0 && input.messageCount >= FOLLOWUP_OFFER_AFTER_MESSAGES) {
    return "followup";
  }
  return null;
}

/**
 * Normaliza un WhatsApp a formato internacional (+52…). Un número de 10
 * dígitos sin lada internacional se toma como de México. Devuelve null si
 * no parece un número válido.
 */
export function normalizeWhatsApp(raw: string): string | null {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return null;
  const hasPlus = trimmed.startsWith("+") || trimmed.startsWith("00");
  let digits = trimmed.replace(/\D/g, "");
  if (trimmed.startsWith("00")) digits = digits.slice(2);
  let e164: string;
  if (hasPlus) e164 = `+${digits}`;
  else if (digits.length === 10) e164 = `+52${digits}`;
  else if (digits.length === 12 && digits.startsWith("52")) e164 = `+${digits}`;
  else if (digits.length === 13 && digits.startsWith("521")) e164 = `+52${digits.slice(3)}`;
  else e164 = `+${digits}`;
  return /^\+[1-9][0-9]{7,14}$/.test(e164) ? e164 : null;
}

/** Nombre de pila limpio (sin números ni símbolos raros), máximo 60 caracteres. */
export function cleanFirstName(raw: string): string | null {
  const value = (raw ?? "")
    .replace(/[^\p{L}\p{M}' .-]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
  return value.length >= 2 ? value : null;
}

/** Texto literal del permiso que acepta la persona (se guarda con el prospecto). */
export const PROSPECT_CONSENT_TEXT =
  "Acepto que un concierge de Valladolid.mx me escriba por WhatsApp para darle seguimiento a mi viaje. Puedo pedir que dejen de escribirme cuando quiera.";

/** Un prospecto "espera" si es nuevo y nadie lo ha revisado. */
export function isWaitingProspect(p: {
  readonly stage: string;
  readonly reviewed_at: string | null;
}): boolean {
  return p.stage === "nuevo" && !p.reviewed_at;
}

/** Minutos de espera desde la última actividad del prospecto. */
export function minutesWaiting(lastActivityIso: string, now: Date = new Date()): number {
  const t = Date.parse(lastActivityIso);
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, Math.floor((now.getTime() - t) / 60000));
}

/** Marca de urgencia: más de 30 minutos esperando (como en Zazil). */
export const URGENT_WAIT_MINUTES = 30;
