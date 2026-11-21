/**
 * CRM Prospectos · Fase 3 · reglas puras del cierre (propuesta 19.48).
 *
 * Enlace personal (registro o pago de experiencia), ficha de traspaso al
 * CRM Arma tu viaje, mensajes de enlace y de recontacto en el idioma del
 * cliente y la regla de venta directa. Sin dependencias de servidor ni de
 * navegador: las usan las funciones de servidor, el comando `#enlace`, la
 * página pública del enlace y las pruebas.
 */
import {
  CONTACT_OFFER_REASON_LABEL,
  type ContactOfferReason,
} from "@/lib/crm/prospect-rules";

/** Días que vale un enlace personal antes de vencer. */
export const INVITE_TTL_DAYS = 14;
/** Días antes del viaje en que se hace el primer recontacto. */
export const RECONTACT_DAYS_BEFORE = 30;

export const INVITE_PURPOSES = ["register", "pay"] as const;
export type InvitePurpose = (typeof INVITE_PURPOSES)[number];

export const CLOSURE_LANGUAGES = ["es", "en", "fr", "de", "it", "pt"] as const;
export type ClosureLanguage = (typeof CLOSURE_LANGUAGES)[number];
export function toClosureLanguage(v: unknown): ClosureLanguage {
  return typeof v === "string" && (CLOSURE_LANGUAGES as readonly string[]).includes(v)
    ? (v as ClosureLanguage)
    : "es";
}

/* ───────────────────────────── Enlace personal ───────────────────────────── */

const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;

export function isInviteTokenShape(token: unknown): token is string {
  return typeof token === "string" && TOKEN_RE.test(token);
}

/** 32 bytes aleatorios en base64url (43 caracteres). Sólo se guarda su huella. */
export function generateInviteToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function hashInviteToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function inviteUrl(origin: string, token: string): string {
  return `${origin.replace(/\/+$/, "")}/continuar/${token}`;
}

export type InviteState = "valid" | "used" | "expired";
export function inviteState(
  row: { expires_at: string; used_at: string | null },
  now: Date = new Date(),
): InviteState {
  if (row.used_at) return "used";
  return new Date(row.expires_at).getTime() < now.getTime() ? "expired" : "valid";
}

/* ───────────────────────────── Venta directa ───────────────────────────── */

export interface SellableProductInput {
  readonly product_type: string | null;
  readonly status: string | null;
  readonly deleted_at?: string | null;
  readonly direct_sale_enabled: boolean | null;
  readonly direct_sale_price_amount: number | null;
}

/** Sólo las experiencias publicadas con cobro activo y precio tienen enlace de pago. */
export function canSellDirect(p: SellableProductInput | null | undefined): boolean {
  return Boolean(
    p &&
      p.product_type === "experiencia" &&
      p.status === "published" &&
      !p.deleted_at &&
      p.direct_sale_enabled === true &&
      typeof p.direct_sale_price_amount === "number" &&
      p.direct_sale_price_amount > 0,
  );
}

/** `#enlace` sin texto = registro; `#enlace <experiencia>` = pago de esa experiencia. */
export function parseEnlaceArg(arg: string): { purpose: InvitePurpose; query: string | null } {
  const q = arg
    .trim()
    .replace(/^https?:\/\/\S+\//, "")
    .slice(0, 80);
  if (!q || /^(registro|cuenta|register|signup)$/i.test(q)) return { purpose: "register", query: null };
  return { purpose: "pay", query: q };
}

/* ───────────────────────────── Ficha de traspaso ───────────────────────────── */

export interface HandoffProspect {
  readonly first_name: string;
  readonly language: string;
  readonly source: string;
  readonly capture_reason: string | null;
  readonly destination_slug: string | null;
  readonly trip_brief: { readonly [key: string]: unknown };
  readonly trip_items: ReadonlyArray<{ kind: string; targetId: string | null; title: string | null }>;
  readonly handoff_summary: string | null;
}

const SOURCE_LABEL: Record<string, string> = {
  alux_web: "Alux en Valladolid.mx",
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  facebook: "Facebook",
  manual: "Alta manual",
};
const LANGUAGE_LABEL: Record<string, string> = {
  es: "español",
  en: "inglés",
  fr: "francés",
  de: "alemán",
  it: "italiano",
  pt: "portugués",
};

function strList(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim() !== "") : [];
}
function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}
function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null;
}
function humanize(slug: string): string {
  return slug.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function tripDestinations(p: HandoffProspect): string[] {
  const list = strList(p.trip_brief["destinations"]);
  if (!list.length && p.destination_slug) list.push(p.destination_slug);
  return [...new Set(list)].map(humanize);
}

/**
 * Ficha de traspaso: sólo datos guardados en el pre-expediente, nunca
 * inventados. Sin teléfono ni correo (ya viven en la cuenta del viajero).
 */
export function buildHandoffSummary(p: HandoffProspect): string {
  const b = p.trip_brief;
  const lines: string[] = [];
  lines.push(
    `Quién: ${p.first_name} · habla ${LANGUAGE_LABEL[p.language] ?? p.language} · llegó por ${
      SOURCE_LABEL[p.source] ?? p.source
    }.`,
  );
  const start = str(b["startDate"]);
  const end = str(b["endDate"]);
  const days = num(b["durationDays"]);
  const party = num(b["partySize"]);
  const trip: string[] = [];
  if (start) trip.push(end ? `del ${start} al ${end}` : `desde el ${start}`);
  else if (days) trip.push(`${days} días`);
  if (party) trip.push(`${party} ${party === 1 ? "persona" : "personas"}`);
  const dests = tripDestinations(p);
  if (dests.length) trip.push(`destinos: ${dests.join(", ")}`);
  lines.push(trip.length ? `Viaje: ${trip.join(" · ")}.` : "Viaje: todavía sin fechas ni personas.");
  const interests = strList(b["interests"]);
  if (interests.length) lines.push(`Le interesa: ${interests.join(", ")}.`);
  const seen = p.trip_items.map((i) => i.title).filter((t): t is string => Boolean(t && t.trim()));
  if (seen.length) lines.push(`Lo que eligió con Alux: ${seen.slice(0, 15).join(", ")}.`);
  if (p.capture_reason) {
    const label = CONTACT_OFFER_REASON_LABEL[p.capture_reason as ContactOfferReason];
    if (label) lines.push(`Motivo del contacto: ${label}.`);
  }
  if (p.handoff_summary?.trim()) lines.push(`Notas del pase: ${p.handoff_summary.trim()}`);
  lines.push("Siguiente paso: armar la propuesta. La plática completa está en CRM Prospectos.");
  return lines.join("\n").slice(0, 4000);
}

/** Resumen corto del expediente (máx. 500 caracteres, el límite del expediente). */
export function buildCaseSummary(p: HandoffProspect): string {
  const dests = tripDestinations(p);
  const start = str(p.trip_brief["startDate"]);
  const parts = [`Viaje de ${p.first_name} desde CRM Prospectos`];
  if (dests.length) parts.push(dests.join(", "));
  if (start) parts.push(`desde el ${start}`);
  return parts.join(" · ").slice(0, 500);
}

const PLAN_ITEM_KINDS = ["destination", "business", "product", "event", "route", "place"] as const;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Lugares del pre-expediente → partes del viaje en Mi Viaje (sin duplicar objetivos). */
export function toPlanItems(
  items: HandoffProspect["trip_items"],
): Array<{ item_kind: string; target_id: string | null; snapshot: { title: string | null }; notes: string | null }> {
  const seen = new Set<string>();
  const out: Array<{
    item_kind: string;
    target_id: string | null;
    snapshot: { title: string | null };
    notes: string | null;
  }> = [];
  for (const it of items.slice(0, 40)) {
    const kind = (PLAN_ITEM_KINDS as readonly string[]).includes(it.kind) ? it.kind : null;
    const id = it.targetId && UUID_RE.test(it.targetId) ? it.targetId : null;
    if (kind && id) {
      const key = `${kind}:${id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ item_kind: kind, target_id: id, snapshot: { title: it.title ?? null }, notes: null });
    } else if (it.title?.trim()) {
      out.push({
        item_kind: "note",
        target_id: null,
        snapshot: { title: it.title.trim().slice(0, 180) },
        notes: it.title.trim().slice(0, 180),
      });
    }
  }
  return out;
}

/* ───────────────────────────── Mensajes al cliente ───────────────────────────── */

const INVITE_COPY: Record<
  ClosureLanguage,
  { register: (n: string, u: string) => string; pay: (n: string, p: string, u: string) => string }
> = {
  es: {
    register: (n, u) =>
      `Hola ${n}, aquí está tu enlace para guardar tu viaje y que tu concierge te arme la propuesta. Ya trae lo que platicamos: ${u}`,
    pay: (n, p, u) => `Hola ${n}, este es tu enlace para reservar «${p}». Creas tu cuenta y pagas en un paso: ${u}`,
  },
  en: {
    register: (n, u) =>
      `Hi ${n}, here is your link to save your trip so your concierge can prepare your proposal. It already includes what we talked about: ${u}`,
    pay: (n, p, u) => `Hi ${n}, here is your link to book “${p}”. Create your account and pay in one step: ${u}`,
  },
  fr: {
    register: (n, u) =>
      `Bonjour ${n}, voici votre lien pour enregistrer votre voyage afin que votre concierge prépare votre proposition. Il reprend ce dont nous avons parlé : ${u}`,
    pay: (n, p, u) => `Bonjour ${n}, voici votre lien pour réserver « ${p} ». Créez votre compte et payez en une étape : ${u}`,
  },
  de: {
    register: (n, u) =>
      `Hallo ${n}, hier ist dein Link, um deine Reise zu speichern, damit dein Concierge dir ein Angebot erstellt. Er enthält schon, worüber wir gesprochen haben: ${u}`,
    pay: (n, p, u) => `Hallo ${n}, hier ist dein Link, um „${p}“ zu buchen. Konto erstellen und in einem Schritt bezahlen: ${u}`,
  },
  it: {
    register: (n, u) =>
      `Ciao ${n}, ecco il tuo link per salvare il viaggio e far preparare la proposta al tuo concierge. Contiene già quello di cui abbiamo parlato: ${u}`,
    pay: (n, p, u) => `Ciao ${n}, ecco il tuo link per prenotare «${p}». Crei l'account e paghi in un solo passo: ${u}`,
  },
  pt: {
    register: (n, u) =>
      `Olá ${n}, aqui está o seu link para salvar sua viagem e o seu concierge preparar a proposta. Já traz o que conversamos: ${u}`,
    pay: (n, p, u) => `Olá ${n}, aqui está o seu link para reservar “${p}”. Crie sua conta e pague em um passo: ${u}`,
  },
};

export function inviteMessage(
  lang: unknown,
  input: { firstName: string; url: string; purpose: InvitePurpose; productName?: string | null },
): string {
  const copy = INVITE_COPY[toClosureLanguage(lang)];
  return input.purpose === "pay" && input.productName
    ? copy.pay(input.firstName, input.productName, input.url)
    : copy.register(input.firstName, input.url);
}

const RECONTACT_COPY: Record<ClosureLanguage, (n: string, d: string | null) => string> = {
  es: (n, d) =>
    `Hola ${n}, faltan 30 días para tu viaje${d ? ` a ${d}` : ""}. ¿Te ayudo a dejar todo listo? Si quieres, tu concierge te escribe hoy.`,
  en: (n, d) =>
    `Hi ${n}, your trip${d ? ` to ${d}` : ""} is 30 days away. Can I help you get everything ready? Your concierge can write to you today.`,
  fr: (n, d) =>
    `Bonjour ${n}, votre voyage${d ? ` à ${d}` : ""} est dans 30 jours. Puis-je vous aider à tout préparer ? Votre concierge peut vous écrire aujourd'hui.`,
  de: (n, d) =>
    `Hallo ${n}, in 30 Tagen beginnt deine Reise${d ? ` nach ${d}` : ""}. Soll ich dir helfen, alles vorzubereiten? Dein Concierge kann dir heute schreiben.`,
  it: (n, d) =>
    `Ciao ${n}, mancano 30 giorni al tuo viaggio${d ? ` a ${d}` : ""}. Ti aiuto a preparare tutto? Il tuo concierge può scriverti oggi.`,
  pt: (n, d) =>
    `Olá ${n}, faltam 30 dias para a sua viagem${d ? ` a ${d}` : ""}. Posso ajudar a deixar tudo pronto? O seu concierge pode escrever hoje.`,
};

export function recontactMessage(lang: unknown, input: { firstName: string; destination: string | null }): string {
  return RECONTACT_COPY[toClosureLanguage(lang)](input.firstName, input.destination);
}
