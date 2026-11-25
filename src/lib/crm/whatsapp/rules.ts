/**
 * CRM Prospectos · Fase 2 · reglas puras de WhatsApp (propuesta 19.48).
 *
 * Sin dependencias de servidor ni de navegador: interpretan los avisos del
 * servidor de mensajes (Evolution API), los comandos `#` del concierge, el
 * pase a concierge y el formato de los mensajes. Las usan el receptor de
 * avisos, el procesador y las pruebas.
 */
import { decideContactOffer, normalizeWhatsApp } from "@/lib/crm/prospect-rules";

/** Prefijo obligatorio de las líneas de Valladolid.mx en el servidor compartido. */
export const VMX_INSTANCE_PREFIX = "vmx-";
const VMX_INSTANCE_RE = /^vmx-[a-z0-9-]{3,40}$/;

export function isVmxInstance(name: string | null | undefined): name is string {
  return typeof name === "string" && VMX_INSTANCE_RE.test(name);
}

/** Nombre de línea `vmx-<etiqueta>-<sufijo>` (sólo minúsculas, números y guiones). */
export function makeInstanceName(label: string, suffix: string): string {
  const slug =
    label
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 24) || "linea";
  const tail = suffix
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 8);
  return `${VMX_INSTANCE_PREFIX}${slug}-${tail || "0"}`.replace(/-+/g, "-");
}

/* ─────────────────────────── Números y chats ─────────────────────────── */

export function isDirectChatJid(jid: string | null | undefined): boolean {
  if (!jid) return false;
  return jid.endsWith("@s.whatsapp.net") || jid.endsWith("@lid") || jid.endsWith("@c.us");
}

/**
 * Teléfono internacional de un chat de WhatsApp. Los números móviles de
 * México con «1» de por medio (+521…) se guardan como +52… para coincidir con
 * los que se capturan en la web. Los chats `@lid` no traen teléfono.
 */
export function jidToE164(jid: string | null | undefined): string | null {
  if (!jid || !/@(s\.whatsapp\.net|c\.us)$/.test(jid)) return null;
  let digits = jid.split("@")[0]!.split(":")[0]!.replace(/\D/g, "");
  if (digits.length === 13 && digits.startsWith("521")) digits = `52${digits.slice(3)}`;
  return normalizeWhatsApp(`+${digits}`);
}

/* ─────────────────────────── Avisos del servidor ─────────────────────────── */

export type WebhookEvent = "messages.upsert" | "connection.update" | "qrcode.updated" | "other";

export interface ParsedWebhook {
  readonly event: WebhookEvent;
  readonly rawEvent: string;
  readonly instance: string | null;
  readonly data: unknown;
  readonly dateTime: string | null;
}

function normalizeEventName(raw: string): WebhookEvent {
  const e = raw.toLowerCase().replace(/_/g, ".");
  if (e === "messages.upsert") return "messages.upsert";
  if (e === "connection.update") return "connection.update";
  if (e === "qrcode.updated") return "qrcode.updated";
  return "other";
}

export function parseWebhookBody(body: unknown): ParsedWebhook | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const rawEvent = typeof b["event"] === "string" ? b["event"].slice(0, 80) : "";
  if (!rawEvent) return null;
  const instanceRaw = b["instance"];
  const instance =
    typeof instanceRaw === "string"
      ? instanceRaw
      : instanceRaw && typeof instanceRaw === "object"
        ? String((instanceRaw as Record<string, unknown>)["instanceName"] ?? "") || null
        : null;
  return {
    event: normalizeEventName(rawEvent),
    rawEvent,
    instance,
    data: b["data"] ?? null,
    dateTime: typeof b["date_time"] === "string" ? b["date_time"] : null,
  };
}

/** Copia del aviso para guardar, sin la clave de la línea que el servidor adjunta. */
export function redactWebhookBody(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== "object") return {};
  const copy: Record<string, unknown> = { ...(body as Record<string, unknown>) };
  delete copy["apikey"];
  delete copy["server_url"];
  return copy;
}

export interface InboundMessage {
  readonly id: string;
  readonly remoteJid: string;
  /** Teléfono real cuando el chat llega como `@lid` y el servidor lo informa. */
  readonly altJid: string | null;
  readonly fromMe: boolean;
  readonly pushName: string | null;
  readonly text: string;
  readonly kind: "text" | "media" | "other";
  readonly timestampSec: number | null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

export function extractMessageText(message: unknown): {
  text: string;
  kind: InboundMessage["kind"];
} {
  if (!message || typeof message !== "object") return { text: "", kind: "other" };
  const m = message as Record<string, Record<string, unknown> | string | undefined>;
  const conversation = str(m["conversation"]);
  if (conversation) return { text: conversation, kind: "text" };
  const ext = m["extendedTextMessage"];
  if (ext && typeof ext === "object" && str(ext["text"])) {
    return { text: String(ext["text"]), kind: "text" };
  }
  for (const key of [
    "imageMessage",
    "videoMessage",
    "documentMessage",
    "audioMessage",
    "stickerMessage",
    "locationMessage",
    "contactMessage",
  ]) {
    const media = m[key];
    if (media && typeof media === "object") {
      return { text: str(media["caption"]) ?? "", kind: "media" };
    }
  }
  return { text: "", kind: "other" };
}

export function parseInboundMessage(data: unknown): InboundMessage | null {
  const raw = Array.isArray(data) ? data[0] : data;
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Record<string, unknown>;
  const key = (d["key"] ?? {}) as Record<string, unknown>;
  const id = str(key["id"]);
  const remoteJid = str(key["remoteJid"]);
  if (!id || !remoteJid) return null;
  const { text, kind } = extractMessageText(d["message"]);
  const ts = d["messageTimestamp"];
  return {
    id: id.slice(0, 120),
    remoteJid: remoteJid.slice(0, 120),
    altJid: (str(key["remoteJidAlt"]) ?? str(key["senderPn"]))?.slice(0, 120) ?? null,
    fromMe: key["fromMe"] === true,
    pushName: str(d["pushName"])?.slice(0, 80) ?? null,
    text: text.trim().slice(0, 4000),
    kind,
    timestampSec: typeof ts === "number" ? ts : typeof ts === "string" ? Number(ts) || null : null,
  };
}

/** Llave idempotente de cada aviso: el mismo mensaje nunca se procesa dos veces. */
export function deliveryKey(parsed: ParsedWebhook, fallbackHash: string): string {
  const inst = parsed.instance ?? "?";
  if (parsed.event === "messages.upsert") {
    const msg = parseInboundMessage(parsed.data);
    if (msg) return `msg:${inst}:${msg.id}`;
  }
  return `${parsed.event === "other" ? parsed.rawEvent : parsed.event}:${inst}:${fallbackHash}`.slice(
    0,
    300,
  );
}

export type LineStatus = "pending" | "connecting" | "connected" | "disconnected";

export function mapConnectionState(state: unknown): LineStatus | null {
  const s = typeof state === "string" ? state.toLowerCase() : "";
  if (s === "open") return "connected";
  if (s === "connecting") return "connecting";
  if (s === "close" || s === "closed" || s === "refused") return "disconnected";
  return null;
}

/* ─────────────────────────── Comandos del concierge ─────────────────────────── */

export const CONCIERGE_COMMANDS = [
  "alux",
  "apagar",
  "cotizar",
  "enlace",
  "nota",
  "agenda",
] as const;
export type ConciergeCommand = (typeof CONCIERGE_COMMANDS)[number];

export const CONCIERGE_COMMAND_HELP: Record<ConciergeCommand, string> = {
  alux: "Devuelve la plática a Alux.",
  apagar: "Alux deja de contestar en esta plática.",
  cotizar: "Marca que estás preparando la cotización (Alux se calla).",
  enlace: "Manda al cliente su enlace personal para crear su cuenta; con el nombre de una experiencia (y personas, p. ej. «#enlace cenote 4»), su preventa con enlace de pago.",
  nota: "Guarda una nota en la ficha: #nota texto.",
  agenda: "Agenda el seguimiento: #agenda 2026-11-25 10:00 o #agenda 25/11 10:00.",
};

export function parseConciergeCommand(
  text: string,
): { command: ConciergeCommand; arg: string } | null {
  const m = /^\s*#([a-záéíóú]+)\b\s*([\s\S]*)$/i.exec(text ?? "");
  if (!m) return null;
  const word = m[1]!
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (!(CONCIERGE_COMMANDS as readonly string[]).includes(word)) return null;
  return { command: word as ConciergeCommand, arg: (m[2] ?? "").trim().slice(0, 1800) };
}

/**
 * Fecha del comando #agenda en hora de Mérida (UTC-6, sin horario de verano).
 * Acepta «2026-11-25 10:00», «25/11 10:00» o «25/11/2026». Sin hora → 10:00.
 */
export function parseAgendaDate(arg: string, now: Date = new Date()): string | null {
  const s = (arg ?? "").trim();
  let y: number, mo: number, d: number;
  let rest: string;
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})(.*)$/.exec(s);
  const dmy = /^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?(.*)$/.exec(s);
  if (iso) {
    y = Number(iso[1]);
    mo = Number(iso[2]);
    d = Number(iso[3]);
    rest = iso[4] ?? "";
  } else if (dmy) {
    d = Number(dmy[1]);
    mo = Number(dmy[2]);
    y = dmy[3] ? Number(dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3]) : now.getUTCFullYear();
    rest = dmy[4] ?? "";
  } else return null;
  const hm = /(\d{1,2}):(\d{2})/.exec(rest);
  const h = hm ? Number(hm[1]) : 10;
  const min = hm ? Number(hm[2]) : 0;
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || min > 59) return null;
  const utc = Date.UTC(y, mo - 1, d, h + 6, min);
  const check = new Date(utc - 6 * 3600_000);
  if (check.getUTCDate() !== d || check.getUTCMonth() !== mo - 1) return null;
  let result = utc;
  // «25/11» sin año que ya pasó → el próximo año.
  if (dmy && !dmy[3] && result < now.getTime() - 86400_000) {
    result = Date.UTC(y + 1, mo - 1, d, h + 6, min);
  }
  return new Date(result).toISOString();
}

/* ─────────────────────────── Pase a concierge ─────────────────────────── */

export type HandoffReason = "concierge" | "booking" | "itinerary";

/**
 * Pase automático: pide una persona, quiere reservar o comprar, o quiere que
 * le armen el viaje completo. Una pregunta de precio sola no es pase: Alux
 * da el precio publicado de experiencias o explica que el concierge cotiza.
 */
export function detectHandoffReason(text: string): HandoffReason | null {
  const plain = (text ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  for (const candidate of [text ?? "", plain]) {
    const reason = decideContactOffer({
      authenticated: false,
      alreadyProspect: false,
      offerCount: 0,
      lastOfferMessageCount: null,
      messageCount: 0,
      message: candidate,
    });
    if (reason === "concierge" || reason === "booking" || reason === "itinerary") return reason;
  }
  return null;
}

/* ─────────────────────────── Formato de WhatsApp ─────────────────────────── */

export const WHATSAPP_MAX_REPLY_CHARS = 1000;

/**
 * Formato de plática como se escribe por WhatsApp: sin negritas, sin viñetas
 * ni encabezados, como máximo un signo de admiración y sin saltos de más.
 */
export function formatForWhatsApp(text: string): string {
  let t = (text ?? "").replace(/\r/g, "");
  t = t.replace(/\*\*(.+?)\*\*/g, "$1").replace(/__(.+?)__/g, "$1");
  t = t.replace(/(^|\s)\*([^*\n]+)\*(?=\s|[.,;:!?]|$)/g, "$1$2");
  t = t.replace(/^\s{0,3}#{1,6}\s+/gm, "");
  t = t.replace(/^\s*(?:[-•*·]|\d+[.)])\s+/gm, "");
  t = t.replace(/\n{3,}/g, "\n\n").trim();
  let seen = 0;
  t = t.replace(/!+/g, () => (seen++ === 0 ? "!" : "."));
  let opened = 0;
  t = t.replace(/¡/g, (m) => (opened++ === 0 ? m : ""));
  if (t.length > WHATSAPP_MAX_REPLY_CHARS) {
    const cut = t.slice(0, WHATSAPP_MAX_REPLY_CHARS);
    const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("\n"));
    t = (end > 400 ? cut.slice(0, end + 1) : cut).trim();
  }
  return t;
}

/* ─────────────────────────── Decisión por mensaje ─────────────────────────── */

export type InboundAction = "ignore" | "own_echo" | "command" | "human_reply" | "customer";

export function decideInboundAction(input: {
  readonly remoteJid: string;
  readonly fromMe: boolean;
  readonly isOwnOutbound: boolean;
  readonly text: string;
}): InboundAction {
  if (!isDirectChatJid(input.remoteJid)) return "ignore";
  if (input.fromMe) {
    if (input.isOwnOutbound) return "own_echo";
    return parseConciergeCommand(input.text) ? "command" : "human_reply";
  }
  return "customer";
}

/** Alux contesta sólo si la línea lo permite y ningún concierge tomó la plática. */
export function shouldAluxReply(input: {
  readonly aluxEnabled: boolean;
  readonly mode: "alux" | "human";
  readonly repliesLast24h: number;
}): boolean {
  return (
    input.aluxEnabled && input.mode === "alux" && input.repliesLast24h < MAX_ALUX_REPLIES_PER_DAY
  );
}

/** Tope de respuestas de Alux por plática al día (cuida costo y el número). */
export const MAX_ALUX_REPLIES_PER_DAY = 40;
/** Tope de envíos automáticos por minuto en todo WhatsApp (cuida el número). */
export const MAX_SENDS_PER_MINUTE = 12;

/* ─────────────────────────── Dirección de avisos ─────────────────────────── */

export const STABLE_PREVIEW_ORIGIN =
  "https://project--fd89b51f-9afc-4e15-8ee2-21fe468f6aa9-dev.lovable.app";

/**
 * Dirección pública que recibe los avisos de la línea. Desde la vista previa
 * o el equipo de desarrollo se usa la dirección estable de la vista previa;
 * desde el sitio publicado, el propio sitio.
 */
/** Dominios propios del sitio publicado que pueden recibir avisos. */
export const OWN_WEBHOOK_HOSTS = new Set([
  "valladolidmx.lovable.app",
  "www.quehacerenvalladolid.com",
  "quehacerenvalladolid.com",
  "www.valladolid.com.mx",
  "valladolid.com.mx",
  "www.valladolid.mx",
  "valladolid.mx",
]);

export function resolveWebhookOrigin(requestOrigin: string | null | undefined): string {
  try {
    const url = new URL(requestOrigin ?? "");
    const host = url.hostname;
    if (
      url.protocol !== "https:" ||
      host === "localhost" ||
      host.startsWith("id-preview--") ||
      host.endsWith(".lovableproject.com") ||
      host.endsWith("-dev.lovable.app")
    ) {
      return STABLE_PREVIEW_ORIGIN;
    }
    // Sólo dominios propios: una cabecera ajena nunca decide a dónde llegan los avisos.
    return OWN_WEBHOOK_HOSTS.has(host) ? url.origin : STABLE_PREVIEW_ORIGIN;
  } catch {
    return STABLE_PREVIEW_ORIGIN;
  }
}

export function webhookUrl(origin: string, token: string): string {
  return `${origin.replace(/\/+$/, "")}/api/public/whatsapp/evolution?t=${encodeURIComponent(token)}`;
}

/** Idiomas de la plática que el CRM reconoce. */
export const CHAT_LANGUAGES = ["es", "en", "fr", "de", "it", "pt"] as const;
export type ChatLanguage = (typeof CHAT_LANGUAGES)[number];
export function toChatLanguage(v: unknown): ChatLanguage | null {
  return typeof v === "string" && (CHAT_LANGUAGES as readonly string[]).includes(v)
    ? (v as ChatLanguage)
    : null;
}
