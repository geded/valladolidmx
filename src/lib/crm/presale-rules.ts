/**
 * CRM Prospectos · Preventa — reglas puras (propuesta 19.48, como en Zazil).
 *
 * Una preventa es el enlace de pago de una experiencia con venta directa:
 * folio «PRE-», personas, total congelado al crearla y vigencia. Al pagarse
 * por el cobro de la plataforma se convierte en reservación. Sin dependencias
 * de servidor ni de navegador: las usan el panel, «Preventa», `#enlace`, la
 * página del enlace y las pruebas.
 */
import { formatMeridaDateTime } from "@/lib/time/merida";
import { toClosureLanguage, type ClosureLanguage } from "./closure-rules";

/** Vigencia predeterminada de una preventa (horas). */
export const PRESALE_DEFAULT_TTL_HOURS = 24;
/** Vigencias que el concierge puede elegir (horas). */
export const PRESALE_TTL_OPTIONS = [6, 12, 24, 48, 72, 168] as const;
/** Horas que suma «Ampliar». */
export const PRESALE_EXTEND_OPTIONS = [24, 48] as const;
export const PRESALE_MAX_QUANTITY = 50;

export function ttlLabel(hours: number): string {
  if (hours > 72 && hours % 24 === 0) return `${hours / 24} días`;
  return `${hours} horas`;
}

export function presaleTotal(unitAmountCents: number, quantity: number): number {
  const q = Math.min(Math.max(Math.trunc(quantity) || 1, 1), PRESALE_MAX_QUANTITY);
  return Math.max(0, Math.round(unitAmountCents)) * q;
}

/** Importes en centavos → «$1,200 MXN». */
export function presaleMoney(cents: number | null | undefined, currency = "MXN"): string {
  const value = (cents ?? 0) / 100;
  try {
    return `${new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency,
      maximumFractionDigits: value % 1 === 0 ? 0 : 2,
    }).format(value)} ${currency}`;
  } catch {
    return `${value} ${currency}`;
  }
}

export type PresaleState = "vigente" | "en_pago" | "pagada" | "vencida" | "cancelada";

export const PRESALE_STATE_LABEL: Record<PresaleState, string> = {
  vigente: "Vigente",
  en_pago: "En pago",
  pagada: "Pagada",
  vencida: "Vencida",
  cancelada: "Cancelada",
};

/**
 * Estado visible. Pagada gana siempre (un pago tardío nunca se pierde);
 * después cancelada; vencida al pasar su hora; «en pago» si ya abrió su
 * enlace y tiene reservación por pagar.
 */
export function presaleState(
  row: { expires_at: string; cancelled_at: string | null; order_id: string | null },
  orderStatus: string | null,
  now: Date = new Date(),
): PresaleState {
  if (orderStatus === "paid" || orderStatus === "fulfilled" || orderStatus === "refunded") return "pagada";
  if (row.cancelled_at || orderStatus === "cancelled") return "cancelada";
  if (new Date(row.expires_at).getTime() < now.getTime() || orderStatus === "expired") return "vencida";
  return row.order_id ? "en_pago" : "vigente";
}

/** «Vence en 3 h 20 min» / «Venció hace 2 h». */
export function timeLeftLabel(expiresAt: string, now: Date = new Date()): string {
  const ms = new Date(expiresAt).getTime() - now.getTime();
  const abs = Math.abs(ms);
  const mins = Math.round(abs / 60_000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const d = Math.floor(h / 24);
  const span = d >= 2 ? `${d} días` : h >= 1 ? `${h} h${m ? ` ${m} min` : ""}` : `${Math.max(m, 1)} min`;
  return ms >= 0 ? `Vence en ${span}` : `Venció hace ${span}`;
}

/** `#enlace cenote suytun 4` → experiencia «cenote suytun» para 4 personas. */
export function splitQuantity(query: string): { query: string; quantity: number } {
  const m = /^(.*?)(?:\s+(?:x\s*)?(\d{1,2})(?:\s*(?:personas?|pax|people|persons?))?)$/i.exec(query.trim());
  if (m && m[1] && m[2]) {
    const n = Number(m[2]);
    if (n >= 1 && n <= PRESALE_MAX_QUANTITY) return { query: m[1].trim(), quantity: n };
  }
  return { query: query.trim(), quantity: 1 };
}

const LOCALE: Record<ClosureLanguage, string> = {
  es: "es-MX",
  en: "en-US",
  fr: "fr-FR",
  de: "de-DE",
  it: "it-IT",
  pt: "pt-BR",
};

type PresaleCopy = (i: {
  n: string;
  p: string;
  q: number;
  total: string;
  folio: string;
  until: string;
  url: string;
}) => string;

const PRESALE_COPY: Record<ClosureLanguage, PresaleCopy> = {
  es: (i) =>
    `Hola ${i.n}, tu preventa ${i.folio} de «${i.p}» para ${i.q} ${i.q === 1 ? "persona" : "personas"}: total ${i.total}. Vence el ${i.until} (hora de Yucatán). Creas tu cuenta y pagas aquí: ${i.url}`,
  en: (i) =>
    `Hi ${i.n}, your pre-booking ${i.folio} for “${i.p}”, ${i.q} ${i.q === 1 ? "person" : "people"}: total ${i.total}. It expires on ${i.until} (Yucatán time). Create your account and pay here: ${i.url}`,
  fr: (i) =>
    `Bonjour ${i.n}, votre préréservation ${i.folio} pour « ${i.p} », ${i.q} ${i.q === 1 ? "personne" : "personnes"} : total ${i.total}. Elle expire le ${i.until} (heure du Yucatán). Créez votre compte et payez ici : ${i.url}`,
  de: (i) =>
    `Hallo ${i.n}, deine Vorreservierung ${i.folio} für „${i.p}“, ${i.q} ${i.q === 1 ? "Person" : "Personen"}: gesamt ${i.total}. Sie läuft am ${i.until} ab (Yucatán-Zeit). Konto erstellen und hier bezahlen: ${i.url}`,
  it: (i) =>
    `Ciao ${i.n}, la tua prevendita ${i.folio} per «${i.p}», ${i.q} ${i.q === 1 ? "persona" : "persone"}: totale ${i.total}. Scade il ${i.until} (ora dello Yucatán). Crea il tuo account e paga qui: ${i.url}`,
  pt: (i) =>
    `Olá ${i.n}, sua pré-reserva ${i.folio} de “${i.p}”, ${i.q} ${i.q === 1 ? "pessoa" : "pessoas"}: total ${i.total}. Vence em ${i.until} (horário de Yucatán). Crie sua conta e pague aqui: ${i.url}`,
};

export function presaleMessage(
  lang: unknown,
  input: {
    firstName: string;
    productName: string;
    quantity: number;
    totalCents: number;
    currency: string;
    folio: string;
    expiresAt: string;
    url: string;
  },
): string {
  const l = toClosureLanguage(lang);
  return PRESALE_COPY[l]({
    n: input.firstName,
    p: input.productName,
    q: input.quantity,
    total: presaleMoney(input.totalCents, input.currency),
    folio: input.folio,
    until: formatMeridaDateTime(input.expiresAt, LOCALE[l]) ?? input.expiresAt,
    url: input.url,
  });
}
