/**
 * Agente de WhatsApp del administrador · piezas puras (sin red ni base).
 *
 * El agente sólo habla con su creador (el administrador). Aquí viven las
 * reglas que se prueban sin efectos: el aviso agrupado de nuevas
 * conversaciones con Alux, qué avisos se omiten y cómo se leen las
 * actualizaciones que entrega WhatsApp.
 */
import { isDeclaredBotUserAgent } from "@/lib/visitor-intel/measurement-gate";

export const MERIDA_TIME_ZONE = "America/Merida";
/** Avisos con más de este tiempo sin poder enviarse ya no se mandan. */
export const NOTICE_STALE_MS = 24 * 60 * 60 * 1000;
/** Mensajes escritos al agente antes de conectarlo con este margen no se contestan. */
export const BACKLOG_GRACE_MS = 10 * 60 * 1000;
export const DIGEST_MAX_LINES = 8;
export const WHATSAPP_TEXT_MAX = 4096;

export interface AluxNoticeRow {
  readonly id: string;
  readonly started_at: string;
  readonly destination_slug: string | null;
  readonly registered: boolean;
  readonly user_agent: string | null;
}

export type NoticeVerdict = "send" | "bot" | "stale";

export function classifyNotice(row: AluxNoticeRow, nowMs: number): NoticeVerdict {
  if (isDeclaredBotUserAgent(row.user_agent)) return "bot";
  if (nowMs - Date.parse(row.started_at) > NOTICE_STALE_MS) return "stale";
  return "send";
}

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: MERIDA_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

/** Un solo mensaje por ronda, sin datos personales ni texto de la conversación. */
export function formatAluxDigest(
  rows: readonly AluxNoticeRow[],
  destinationNames: Readonly<Record<string, string>>,
): string {
  const total = rows.length;
  const head =
    total === 1
      ? "🌿 *Alux* · 1 persona inició una conversación"
      : `🌿 *Alux* · ${total} personas iniciaron una conversación`;
  const lines = rows.slice(0, DIGEST_MAX_LINES).map((row) => {
    const place = row.destination_slug
      ? (destinationNames[row.destination_slug] ?? row.destination_slug)
      : "sin destino";
    const who = row.registered ? "viajero con cuenta" : "visitante sin cuenta";
    return `• ${formatTime(row.started_at)} · ${place} · ${who}`;
  });
  const rest = total - lines.length;
  if (rest > 0) lines.push(`• y ${rest} más`);
  return [head, ...lines].join("\n");
}

export interface AgentInboundMessage {
  readonly id: string;
  readonly from: string;
  readonly type: string;
  readonly text: string | null;
  readonly sentAtMs: number;
}

export interface AgentUpdate {
  readonly nextOffset: number | null;
  readonly messages: readonly AgentInboundMessage[];
}

/** Lee el cuerpo de `GET /updates`; tolera campos ausentes. */
export function parseAgentUpdate(payload: unknown): AgentUpdate {
  const root = (payload ?? {}) as Record<string, unknown>;
  const nextOffset = typeof root["next_offset"] === "number" ? root["next_offset"] : null;
  const entries = Array.isArray(root["entry"]) ? (root["entry"] as unknown[]) : [];
  const messages: AgentInboundMessage[] = [];
  for (const entry of entries) {
    const changes = (entry as { changes?: unknown }).changes;
    if (!Array.isArray(changes)) continue;
    for (const change of changes) {
      const value = (change as { value?: { messages?: unknown } }).value;
      const list = Array.isArray(value?.messages) ? value.messages : [];
      for (const raw of list) {
        const m = raw as Record<string, unknown>;
        const id = typeof m["id"] === "string" ? m["id"] : "";
        const from = typeof m["from"] === "string" ? m["from"] : "";
        const type = typeof m["type"] === "string" ? m["type"] : "unknown";
        if (!id || !from.startsWith("user:")) continue;
        const textObj = m["text"] as { body?: unknown } | undefined;
        const text = typeof textObj?.body === "string" ? textObj.body : null;
        const seconds = Number(m["timestamp"]);
        messages.push({
          id,
          from,
          type,
          text,
          sentAtMs: Number.isFinite(seconds) ? seconds * 1000 : Date.now(),
        });
      }
    }
  }
  return { nextOffset, messages };
}

export type InboundDecision = "answer" | "ignore";

/** Se contestan textos y adjuntos nuevos; reacciones y mensajes viejos sólo se marcan leídos. */
export function decideInbound(message: AgentInboundMessage, setupAtMs: number): InboundDecision {
  if (message.type === "reaction") return "ignore";
  if (message.sentAtMs < setupAtMs - BACKLOG_GRACE_MS) return "ignore";
  return "answer";
}

export function clampWhatsAppText(text: string): string {
  const clean = text.trim();
  return clean.length <= WHATSAPP_TEXT_MAX ? clean : `${clean.slice(0, WHATSAPP_TEXT_MAX - 1)}…`;
}
