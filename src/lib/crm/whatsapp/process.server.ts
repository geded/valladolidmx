/**
 * CRM Prospectos · Fase 2 · procesador de avisos de WhatsApp (sólo servidor).
 *
 * Cada aviso ya quedó guardado en `crm_whatsapp_inbox` antes de llegar aquí.
 * Se procesa una sola vez (candado por aviso) y queda pendiente si falla,
 * para reintentarse en el siguiente aviso o en la revisión de cada hora.
 */
import { createHash } from "node:crypto";
import { evolutionChannel } from "@/lib/crm/channel/evolution.server";
import type { WhatsAppChannel } from "@/lib/crm/channel/types";
import { cleanFirstName } from "@/lib/crm/prospect-rules";
import {
  composeBusinessWhatsAppReply,
  composeWhatsAppReply,
  fallbackReply,
  type WhatsAppTripItem,
} from "./alux-reply.server";
import { businessFallbackReply, isBusinessCommand, normalizeTone } from "./business-rules";
import {
  MAX_SENDS_PER_MINUTE,
  decideInboundAction,
  detectHandoffReason,
  jidToE164,
  mapConnectionState,
  parseAgendaDate,
  parseConciergeCommand,
  parseInboundMessage,
  shouldAluxReply,
  toChatLanguage,
  type HandoffReason,
  type InboundMessage,
} from "./rules";

type Admin = (typeof import("@/integrations/supabase/client.server"))["supabaseAdmin"];

export interface InboxRow {
  id: string;
  line_id: string;
  event: string;
  payload: Record<string, unknown>;
  attempts: number;
}

interface LineRow {
  id: string;
  instance_name: string;
  label: string;
  status: string;
  alux_enabled: boolean;
  /** Fase 5 · línea propia de una empresa (null = Valladolid.mx). */
  owner_business_id: string | null;
  alux_greeting: string | null;
  alux_tone: string | null;
  alux_highlights: string | null;
}

const LINE_COLUMNS =
  "id, instance_name, label, status, alux_enabled, owner_business_id, alux_greeting, alux_tone, alux_highlights";

interface SessionRow {
  id: string;
  prospect_id: string | null;
  message_count: number;
  alux_mode: "alux" | "human";
  conversation_language: string | null;
  wa_remote_jid: string | null;
  handoff_requested_at: string | null;
  business_contact_id: string | null;
}

const SESSION_COLUMNS =
  "id, prospect_id, message_count, alux_mode, conversation_language, wa_remote_jid, handoff_requested_at, business_contact_id";

export interface ProcessDeps {
  readonly channel?: WhatsAppChannel;
  readonly compose?: typeof composeWhatsAppReply;
  readonly composeBusiness?: typeof composeBusinessWhatsAppReply;
}

function sessionKeyFor(lineId: string, jid: string): string {
  return `wa:${lineId}:${jid}`.slice(0, 128);
}

function ipHashFor(lineId: string, jid: string): string {
  return `wa-${createHash("sha256").update(`${lineId}:${jid}`).digest("hex").slice(0, 40)}`;
}

async function getOrCreateSession(
  admin: Admin,
  line: LineRow,
  jid: string,
  prospectId: string | null,
  businessContactId: string | null = null,
): Promise<SessionRow> {
  const key = sessionKeyFor(line.id, jid);
  const { data: existing, error } = await admin
    .from("alux_public_sessions")
    .select(SESSION_COLUMNS)
    .eq("session_key", key)
    .maybeSingle();
  if (error) throw new Error(`session_read_failed: ${error.message}`);
  if (existing) {
    const patch: Record<string, unknown> = { last_seen_at: new Date().toISOString() };
    if (prospectId && !existing.prospect_id) patch["prospect_id"] = prospectId;
    if (businessContactId && !existing.business_contact_id)
      patch["business_contact_id"] = businessContactId;
    const { error: upErr } = await admin
      .from("alux_public_sessions")
      .update(patch as never)
      .eq("id", existing.id);
    if (upErr) throw new Error(`session_update_failed: ${upErr.message}`);
    return {
      ...(existing as unknown as SessionRow),
      prospect_id: existing.prospect_id ?? prospectId,
      business_contact_id: existing.business_contact_id ?? businessContactId,
    };
  }
  const { data: created, error: insErr } = await admin
    .from("alux_public_sessions")
    .upsert(
      {
        session_key: key,
        ip_hash: ipHashFor(line.id, jid),
        user_agent: "whatsapp",
        channel: "whatsapp",
        whatsapp_line_id: line.id,
        wa_remote_jid: jid,
        prospect_id: prospectId,
        owner_business_id: line.owner_business_id,
        business_contact_id: businessContactId,
        last_seen_at: new Date().toISOString(),
      } as never,
      { onConflict: "session_key" },
    )
    .select(SESSION_COLUMNS)
    .single();
  if (insErr || !created) throw new Error(`session_create_failed: ${insErr?.message ?? "empty"}`);
  return created as unknown as SessionRow;
}

async function insertMessage(
  admin: Admin,
  row: {
    session_id: string;
    role: "user" | "assistant";
    author: "alux" | "concierge" | "system" | null;
    content: string;
    external_id: string | null;
    send_status?: "accepted" | "failed" | null;
    original_text?: string | null;
    created_by?: string | null;
    model?: string | null;
    knowledge_ids?: readonly string[];
    latency_ms?: number | null;
  },
): Promise<boolean> {
  const payload = {
    session_id: row.session_id,
    ip_hash: "whatsapp",
    role: row.role,
    author: row.author,
    content: row.content.slice(0, 8000) || "(sin texto)",
    external_id: row.external_id,
    channel: "whatsapp",
    send_status: row.send_status ?? null,
    original_text: row.original_text ?? null,
    created_by: row.created_by ?? null,
    model: row.model ?? null,
    knowledge_ids: row.knowledge_ids ? [...row.knowledge_ids] : [],
    latency_ms: row.latency_ms ?? null,
  };
  if (row.external_id) {
    const { data, error } = await admin
      .from("alux_public_messages")
      .upsert(payload as never, { onConflict: "session_id,external_id", ignoreDuplicates: true })
      .select("id");
    if (error) throw new Error(`message_insert_failed: ${error.message}`);
    return (data ?? []).length > 0;
  }
  const { error } = await admin.from("alux_public_messages").insert(payload as never);
  if (error) throw new Error(`message_insert_failed: ${error.message}`);
  return true;
}

async function prospectNote(
  admin: Admin,
  prospectId: string | null,
  body: string,
  meta: Record<string, unknown> = {},
): Promise<void> {
  if (!prospectId) return;
  await admin.from("concierge_prospect_events").insert({
    prospect_id: prospectId,
    kind: "note",
    body: body.slice(0, 2000),
    meta: { source: "whatsapp", ...meta },
  } as never);
}

/* ─────────────────────────── Conexión de la línea ─────────────────────────── */

async function handleConnection(
  admin: Admin,
  line: LineRow,
  data: unknown,
  channel: WhatsAppChannel,
) {
  const d = (data ?? {}) as Record<string, unknown>;
  const status = mapConnectionState(d["state"]);
  if (!status) return;
  const patch: Record<string, unknown> = {
    status,
    last_state_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (status === "connected") {
    patch["qr_code"] = null;
    const info = await channel.info(line.instance_name).catch(() => null);
    const phone = jidToE164(info?.ownerJid ?? (typeof d["wuid"] === "string" ? d["wuid"] : null));
    if (phone) patch["phone_e164"] = phone;
    if (info?.profileName) patch["profile_name"] = info.profileName;
  }
  const { error } = await admin
    .from("crm_whatsapp_lines")
    .update(patch as never)
    .eq("id", line.id);
  if (error) throw new Error(`line_update_failed: ${error.message}`);
  if (status === "disconnected" && line.status === "connected" && line.owner_business_id) {
    await admin.rpc("business_whatsapp_notify", {
      _business_id: line.owner_business_id,
      _event_id: `biz-wa-line-down:${line.id}:${new Date().toISOString().slice(0, 13)}`,
      _event_type: "Business.WhatsApp.LineDisconnected",
      _url: "/portal/whatsapp",
      _alt: "Tu WhatsApp con Alux se desconectó",
    });
  } else if (status === "disconnected" && line.status === "connected") {
    await admin.rpc("crm_whatsapp_notify_staff", {
      _event_id: `crm-wa-line-down:${line.id}:${new Date().toISOString().slice(0, 13)}`,
      _event_type: "CRM.WhatsApp.LineDisconnected",
      _url: "/concierge/prospectos/whatsapp",
      _alt: `La línea de WhatsApp «${line.label}» se desconectó`,
    });
  }
}

async function handleQr(admin: Admin, line: LineRow, data: unknown) {
  const d = (data ?? {}) as Record<string, unknown>;
  const qr = (d["qrcode"] ?? d) as Record<string, unknown>;
  const base64 = typeof qr["base64"] === "string" ? qr["base64"] : null;
  if (!base64 || base64.length > 60000) return;
  await admin
    .from("crm_whatsapp_lines")
    .update({
      qr_code: base64.startsWith("data:") ? base64 : `data:image/png;base64,${base64}`,
      qr_updated_at: new Date().toISOString(),
      status: "connecting",
    } as never)
    .eq("id", line.id);
}

/* ─────────────────────────── Mensajes ─────────────────────────── */

async function isOwnOutbound(admin: Admin, line: LineRow, msg: InboundMessage): Promise<boolean> {
  const { data } = await admin
    .from("alux_public_messages")
    .select("id, session_id")
    .eq("external_id", msg.id)
    .eq("channel", "whatsapp")
    .limit(1);
  return (data ?? []).length > 0;
}

async function runCommand(
  admin: Admin,
  line: LineRow,
  session: SessionRow,
  msg: InboundMessage,
  channel: WhatsAppChannel,
) {
  const parsed = parseConciergeCommand(msg.text);
  if (!parsed) return;
  if (line.owner_business_id && !isBusinessCommand(parsed.command)) {
    await insertMessage(admin, {
      session_id: session.id,
      role: "assistant",
      author: "system",
      content: `#${parsed.command} sólo funciona en el Centro Concierge; aquí sirven #alux, #apagar y #nota.`,
      external_id: msg.id,
    });
    await channel
      .deleteForEveryone(line.instance_name, { id: msg.id, remoteJid: msg.remoteJid, fromMe: true })
      .catch(() => undefined);
    return;
  }
  const now = new Date().toISOString();
  const sessionPatch: Record<string, unknown> = {};
  let note = "";
  switch (parsed.command) {
    case "alux":
      sessionPatch["alux_mode"] = "alux";
      sessionPatch["handoff_requested_at"] = null;
      sessionPatch["handoff_reason"] = null;
      note = "El concierge devolvió la plática a Alux (#alux).";
      break;
    case "apagar":
      sessionPatch["alux_mode"] = "human";
      note = "El concierge apagó a Alux en esta plática (#apagar).";
      break;
    case "cotizar":
      sessionPatch["alux_mode"] = "human";
      note = `Cotización en preparación (#cotizar)${parsed.arg ? `: ${parsed.arg}` : ""}.`;
      if (session.prospect_id) {
        await admin
          .from("concierge_prospects")
          .update({ temperature: "caliente", last_activity_at: now } as never)
          .eq("id", session.prospect_id);
      }
      break;
    case "enlace":
      note = await sendEnlaceFromCommand(admin, line, session, parsed.arg, channel);
      break;
    case "nota":
      note = parsed.arg ? `Nota desde WhatsApp: ${parsed.arg}` : "";
      break;
    case "agenda": {
      const at = parseAgendaDate(parsed.arg);
      if (at && session.prospect_id) {
        await admin
          .from("concierge_prospects")
          .update({ next_followup_at: at, last_activity_at: now } as never)
          .eq("id", session.prospect_id);
        note = `Seguimiento agendado desde WhatsApp (#agenda ${parsed.arg}).`;
      } else {
        note = `No pude leer la fecha de #agenda: «${parsed.arg}». Usa 2026-11-25 10:00 o 25/11 10:00.`;
      }
      break;
    }
  }
  if (Object.keys(sessionPatch).length) {
    await admin
      .from("alux_public_sessions")
      .update(sessionPatch as never)
      .eq("id", session.id);
  }
  if (note) {
    await insertMessage(admin, {
      session_id: session.id,
      role: "assistant",
      author: "system",
      content: note,
      external_id: msg.id,
    });
    await prospectNote(admin, session.prospect_id, note, { command: parsed.command });
  }
  // El comando no debe quedarse a la vista del cliente.
  await channel
    .deleteForEveryone(line.instance_name, { id: msg.id, remoteJid: msg.remoteJid, fromMe: true })
    .catch(() => undefined);
}

/**
 * `#enlace` → enlace personal para crear la cuenta; `#enlace <experiencia>` →
 * enlace de pago de esa experiencia (sólo experiencias con venta directa).
 * Se le manda al cliente por la misma línea, en su idioma.
 */
async function sendEnlaceFromCommand(
  admin: Admin,
  line: LineRow,
  session: SessionRow,
  arg: string,
  channel: WhatsAppChannel,
): Promise<string> {
  if (!session.prospect_id) {
    return "No se envió el enlace: esta plática todavía no tiene ficha de prospecto.";
  }
  const [{ parseEnlaceArg }, invites, { splitQuantity }] = await Promise.all([
    import("@/lib/crm/closure-rules"),
    import("@/lib/crm/invites.server"),
    import("@/lib/crm/presale-rules"),
  ]);
  const target = parseEnlaceArg(arg);
  let productId: string | null = null;
  // `#enlace cenote suytun 4` → preventa para 4 personas.
  const split = splitQuantity(target.query ?? "");
  if (target.purpose === "pay") {
    target.query = split.query;
    const found = await invites.searchSellableExperiences(admin, target.query ?? "", 3);
    if (found.length !== 1) {
      return found.length
        ? `No se envió el enlace: «${target.query}» coincide con varias experiencias (${found
            .map((f) => f.name)
            .join(", ")}). Escribe el nombre exacto.`
        : `No se envió el enlace: no hay una experiencia con venta directa que coincida con «${target.query}». Hoteles, restaurantes y lo demás los cotiza el concierge.`;
    }
    productId = found[0]!.id;
  }
  const { data: l } = await admin
    .from("crm_whatsapp_lines")
    .select("webhook_base_url")
    .eq("id", line.id)
    .maybeSingle();
  const origin = (l as { webhook_base_url: string | null } | null)?.webhook_base_url;
  if (!origin) return "No se envió el enlace: la línea no tiene dirección del sitio.";
  try {
    const r = await invites.createAndSendInvite(admin, channel, {
      prospectId: session.prospect_id,
      purpose: target.purpose,
      productId,
      createdBy: null,
      via: "whatsapp_command",
      origin,
      send: true,
      quantity: target.purpose === "pay" ? split.quantity : 1,
    });
    if (!r.sent) return `Enlace creado, pero no se pudo enviar: ${r.sendError ?? "sin detalle"}`;
    return r.purpose === "pay"
      ? `Preventa ${r.presale?.folio ?? ""} de «${r.productName}» para ${split.quantity} enviada al cliente (#enlace).`
      : "Enlace personal para crear su cuenta enviado al cliente (#enlace).";
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    return msg === "not_sellable"
      ? "No se envió el enlace: esa experiencia no tiene venta directa activa."
      : "No se pudo crear el enlace (#enlace).";
  }
}

async function touchBusinessContact(
  admin: Admin,
  contactId: string | null,
  patch: Record<string, unknown> = {},
) {
  if (!contactId) return;
  const { data: c } = await admin
    .from("business_whatsapp_contacts")
    .select("stage")
    .eq("id", contactId)
    .maybeSingle();
  await admin
    .from("business_whatsapp_contacts")
    .update({
      last_activity_at: new Date().toISOString(),
      ...(c?.stage === "nuevo" ? { stage: "en_platica" } : {}),
      ...patch,
    } as never)
    .eq("id", contactId);
}

async function recordHumanReply(admin: Admin, session: SessionRow, msg: InboundMessage) {
  const inserted = await insertMessage(admin, {
    session_id: session.id,
    role: "assistant",
    author: "concierge",
    content: msg.text || "(mensaje con archivo)",
    external_id: msg.id,
    send_status: "accepted",
  });
  if (!inserted) return;
  const now = new Date().toISOString();
  await admin
    .from("alux_public_sessions")
    .update({ alux_mode: "human", human_reply_at: now, last_seen_at: now } as never)
    .eq("id", session.id);
  await touchBusinessContact(admin, session.business_contact_id);
  if (session.prospect_id) {
    const { data: p } = await admin
      .from("concierge_prospects")
      .select("stage")
      .eq("id", session.prospect_id)
      .maybeSingle();
    await admin
      .from("concierge_prospects")
      .update({
        last_activity_at: now,
        ...(p?.stage === "nuevo" ? { stage: "contactado" } : {}),
      } as never)
      .eq("id", session.prospect_id);
  }
}

async function sendsLastMinute(admin: Admin): Promise<number> {
  const since = new Date(Date.now() - 60_000).toISOString();
  const { count } = await admin
    .from("alux_public_messages")
    .select("id", { count: "exact", head: true })
    .eq("channel", "whatsapp")
    .eq("author", "alux")
    .gte("created_at", since);
  return count ?? 0;
}

async function aluxRepliesLast24h(admin: Admin, sessionId: string): Promise<number> {
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const { count } = await admin
    .from("alux_public_messages")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId)
    .eq("author", "alux")
    .gte("created_at", since);
  return count ?? 0;
}

async function startHandoff(
  admin: Admin,
  session: SessionRow,
  reason: HandoffReason,
  name: string,
  line: LineRow | null = null,
) {
  const now = new Date().toISOString();
  await admin
    .from("alux_public_sessions")
    .update({ alux_mode: "human", handoff_requested_at: now, handoff_reason: reason } as never)
    .eq("id", session.id);
  if (line?.owner_business_id) {
    const what =
      reason === "concierge"
        ? "pidió hablar con una persona"
        : reason === "booking"
          ? "quiere reservar o comprar"
          : "quiere que le armen el plan";
    await admin.rpc("business_whatsapp_notify", {
      _business_id: line.owner_business_id,
      _event_id: `biz-wa-handoff:${session.id}:${now.slice(0, 16)}`,
      _event_type: "Business.WhatsApp.Handoff",
      _url: "/portal/whatsapp",
      _alt: `${name} ${what} por WhatsApp`,
    });
    return;
  }
  if (session.prospect_id) {
    await admin
      .from("concierge_prospects")
      .update({ temperature: "caliente", last_activity_at: now } as never)
      .eq("id", session.prospect_id);
  }
  const label =
    reason === "concierge"
      ? "pidió hablar con un concierge"
      : reason === "booking"
        ? "quiere reservar o comprar"
        : "quiere que le armen el viaje";
  await prospectNote(admin, session.prospect_id, `Pase a concierge por WhatsApp: ${label}.`, {
    handoff: reason,
  });
  await admin.rpc("crm_whatsapp_notify_staff", {
    _event_id: `crm-wa-handoff:${session.id}:${now.slice(0, 16)}`,
    _event_type: "CRM.WhatsApp.Handoff",
    _url: session.prospect_id
      ? `/concierge/prospectos/${session.prospect_id}`
      : "/concierge/prospectos",
    _alt: `${name} ${label} por WhatsApp`,
  });
}

/** Alux contesta todos los mensajes pendientes de la plática en una sola respuesta. */
async function replyAsAlux(
  admin: Admin,
  line: LineRow,
  sessionId: string,
  handoff: HandoffReason | null,
  deps: Required<ProcessDeps>,
): Promise<void> {
  const locked = await admin.rpc("crm_whatsapp_acquire_reply_lock", {
    _session_id: sessionId,
    _seconds: 60,
  });
  if (locked.error) throw new Error(`lock_failed: ${locked.error.message}`);
  if (locked.data !== true) return; // otra respuesta ya está en curso y verá estos mensajes
  try {
    // Fase 4 · interruptor global «Alux en WhatsApp»: los mensajes quedan guardados
    // para el concierge; solo Alux deja de contestar.
    const { readAluxChannelsServer } = await import("@/lib/alux/channels.server");
    if (!(await readAluxChannelsServer(admin)).whatsapp) return;
    for (let round = 0; round < 2; round++) {
      const { data: s } = await admin
        .from("alux_public_sessions")
        .select(`${SESSION_COLUMNS}, wa_remote_jid`)
        .eq("id", sessionId)
        .single();
      const session = s as unknown as SessionRow;
      if (!session?.wa_remote_jid) return;
      const replies = await aluxRepliesLast24h(admin, sessionId);
      if (
        !handoff &&
        !shouldAluxReply({
          aluxEnabled: line.alux_enabled,
          mode: session.alux_mode,
          repliesLast24h: replies,
        })
      ) {
        return;
      }
      if (!line.alux_enabled) return;
      if ((await sendsLastMinute(admin)) >= MAX_SENDS_PER_MINUTE) {
        throw new Error("rate_limited_retry_later");
      }

      const { data: msgs, error: msgErr } = await admin
        .from("alux_public_messages")
        .select("role, author, content, created_at")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true })
        .limit(60);
      if (msgErr) throw new Error(`history_failed: ${msgErr.message}`);
      const all = (msgs ?? []) as Array<{ role: string; author: string | null; content: string }>;
      let lastReply = -1;
      all.forEach((m, i) => {
        if (m.role === "assistant" && m.author !== "system") lastReply = i;
      });
      const pending = all.slice(lastReply + 1).filter((m) => m.role === "user");
      if (!pending.length) return;
      const history = all
        .slice(0, lastReply + 1)
        .filter((m) => m.author !== "system")
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

      let firstName: string | null = null;
      let tripItems: WhatsAppTripItem[] = [];
      let memory: string[] = [];
      if (session.prospect_id) {
        const [{ data: p }, { data: web }] = await Promise.all([
          admin
            .from("concierge_prospects")
            .select("first_name, trip_items, language")
            .eq("id", session.prospect_id)
            .maybeSingle(),
          admin
            .from("alux_public_sessions")
            .select("summary")
            .eq("prospect_id", session.prospect_id)
            .eq("channel", "web")
            .not("summary", "is", null)
            .order("last_seen_at", { ascending: false })
            .limit(2),
        ]);
        firstName = p?.first_name && p.first_name !== "Contacto de WhatsApp" ? p.first_name : null;
        tripItems = Array.isArray(p?.trip_items)
          ? (p!.trip_items as unknown as WhatsAppTripItem[])
          : [];
        memory = (web ?? []).map((w) => String(w.summary ?? "")).filter(Boolean);
      }
      // Fase 5 · línea de empresa: sólo los datos de esa empresa y su contacto.
      let business: Awaited<
        ReturnType<typeof import("./business-context.server").loadBusinessWhatsAppContext>
      > = null;
      let contactName: string | null = null;
      if (line.owner_business_id) {
        const { loadBusinessWhatsAppContext } = await import("./business-context.server");
        business = await loadBusinessWhatsAppContext(admin, line.owner_business_id);
        if (!business) return;
        if (session.business_contact_id) {
          const { data: c } = await admin
            .from("business_whatsapp_contacts")
            .select("first_name")
            .eq("id", session.business_contact_id)
            .maybeSingle();
          contactName =
            c?.first_name && c.first_name !== "Contacto de WhatsApp" ? c.first_name : null;
          firstName = contactName;
        }
      }

      const t0 = Date.now();
      const mediaOnly = pending.every((m) => m.content.startsWith("(mensaje con archivo"));
      const composeInput = {
        pending: pending.map((m) => m.content),
        history,
        firstName,
        language: toChatLanguage(session.conversation_language),
        otherChannelMemory: memory,
        tripItems,
        handoff,
        isFirstReply: lastReply < 0,
        mediaOnly,
      };
      const result = await (
        business
          ? deps.composeBusiness({
              ...composeInput,
              business,
              presentation: {
                greeting: line.alux_greeting,
                tone: normalizeTone(line.alux_tone),
                highlights: line.alux_highlights,
              },
            })
          : deps.compose(composeInput)
      ).catch(() => null);
      const lang = toChatLanguage(session.conversation_language);
      const text =
        result?.text ??
        (business ? businessFallbackReply(business.name, lang) : fallbackReply(lang));

      let sentId: string | null = null;
      let sendError: string | null = null;
      try {
        sentId = (await deps.channel.sendText(line.instance_name, session.wa_remote_jid, text)).id;
      } catch (e) {
        sendError = e instanceof Error ? e.message.slice(0, 300) : "send_failed";
      }
      await insertMessage(admin, {
        session_id: sessionId,
        role: "assistant",
        author: "alux",
        content: text,
        external_id: sentId,
        send_status: sendError ? "failed" : "accepted",
        model: result?.model ?? null,
        knowledge_ids: result?.knowledgeIds ?? [],
        latency_ms: Date.now() - t0,
      });
      if (result?.gap && business) {
        const { recordBusinessQuestionGap } = await import("./business-context.server");
        await recordBusinessQuestionGap(
          admin,
          business.businessId,
          pending.map((m) => m.content).join(" "),
        );
      } else if (result?.gap) {
        const { recordKnowledgeGapServer } = await import("@/lib/alux/knowledge-gaps.server");
        await recordKnowledgeGapServer(admin, {
          channel: "whatsapp",
          destinationSlug: result.gap.destinationSlug,
          question: pending.map((m) => m.content).join(" "),
          reason: result.gap.reason,
        });
      }
      const now = new Date().toISOString();
      await admin
        .from("alux_public_sessions")
        .update({
          last_seen_at: now,
          ...(result?.language ? { conversation_language: result.language } : {}),
        } as never)
        .eq("id", sessionId);

      if (business && result) {
        const cleanName = result.firstName ? cleanFirstName(result.firstName) : null;
        await touchBusinessContact(admin, session.business_contact_id, {
          ...(result.language ? { language: result.language } : {}),
          ...(cleanName && !contactName ? { first_name: cleanName } : {}),
        });
      }
      if (session.prospect_id && result) {
        const patch: Record<string, unknown> = { last_activity_at: now };
        if (result.language) patch["language"] = result.language;
        const cleanName = result.firstName ? cleanFirstName(result.firstName) : null;
        if (cleanName && !firstName) patch["first_name"] = cleanName;
        if (result.addToTrip.length) {
          const seen = new Set(tripItems.map((i) => `${i.kind}:${i.targetId}`));
          const merged = [...tripItems];
          for (const it of result.addToTrip) {
            const key = `${it.kind}:${it.targetId}`;
            if (!seen.has(key)) {
              seen.add(key);
              merged.push(it);
            }
          }
          patch["trip_items"] = merged.slice(0, 40);
        }
        await admin
          .from("concierge_prospects")
          .update(patch as never)
          .eq("id", session.prospect_id);
      }
      if (result?.handoff && !handoff && session.alux_mode === "alux") {
        await startHandoff(
          admin,
          session,
          "concierge",
          firstName ?? (business ? "Un cliente" : "Un prospecto"),
          line,
        );
      }
      if (sendError) throw new Error(`send_failed: ${sendError}`);
      handoff = null;
    }
  } finally {
    await admin
      .from("alux_public_sessions")
      .update({ reply_lock_until: null } as never)
      .eq("id", sessionId);
  }
}

async function handleMessage(
  admin: Admin,
  line: LineRow,
  data: unknown,
  deps: Required<ProcessDeps>,
): Promise<void> {
  const msg = parseInboundMessage(data);
  if (!msg) return;
  const own = msg.fromMe ? await isOwnOutbound(admin, line, msg) : false;
  const action = decideInboundAction({
    remoteJid: msg.remoteJid,
    fromMe: msg.fromMe,
    isOwnOutbound: own,
    text: msg.text,
  });
  if (action === "ignore" || action === "own_echo") return;

  if (action === "command" || action === "human_reply") {
    const session = await getOrCreateSession(admin, line, msg.remoteJid, null);
    if (action === "command") {
      await runCommand(admin, line, session, msg, deps.channel);
      return;
    }
    // Mientras Alux o el panel envían, el eco de su propio mensaje puede llegar
    // antes de que se guarde su identificador: se reintenta más tarde.
    const { data: lock } = await admin
      .from("alux_public_sessions")
      .select("reply_lock_until")
      .eq("id", session.id)
      .maybeSingle();
    const lockUntil = lock?.reply_lock_until ? Date.parse(lock.reply_lock_until) : 0;
    if (lockUntil > Date.now()) throw new Error("awaiting_own_echo_match");
    await recordHumanReply(admin, session, msg);
    return;
  }

  // Cliente
  const phone = jidToE164(msg.remoteJid) ?? jidToE164(msg.altJid);
  let prospectId: string | null = null;
  let businessContactId: string | null = null;
  if (phone && line.owner_business_id) {
    // Fase 5 · el contacto es de la empresa; no entra a CRM Prospectos.
    const name = cleanFirstName(msg.pushName ?? "") ?? "";
    const { data: touched, error } = await admin.rpc("business_whatsapp_touch_contact", {
      _business_id: line.owner_business_id,
      _phone_e164: phone,
      _first_name: name,
    });
    if (error) throw new Error(`business_contact_failed: ${error.message}`);
    const row = Array.isArray(touched) ? touched[0] : touched;
    businessContactId = (row as { contact_id?: string } | null)?.contact_id ?? null;
  } else if (phone) {
    const name = cleanFirstName(msg.pushName ?? "") ?? "";
    const { data: touched, error } = await admin.rpc("crm_whatsapp_touch_prospect", {
      _phone_e164: phone,
      _first_name: name,
      _language: "es",
    });
    if (error) throw new Error(`prospect_failed: ${error.message}`);
    const row = Array.isArray(touched) ? touched[0] : touched;
    prospectId = (row as { prospect_id?: string } | null)?.prospect_id ?? null;
  }
  const session = await getOrCreateSession(
    admin,
    line,
    msg.remoteJid,
    prospectId,
    businessContactId,
  );
  const inserted = await insertMessage(admin, {
    session_id: session.id,
    role: "user",
    author: null,
    content: msg.text || "(mensaje con archivo)",
    external_id: msg.id,
  });
  if (!inserted) return; // ya estaba procesado
  await admin
    .from("alux_public_sessions")
    .update({ message_count: (session.message_count ?? 0) + 1 } as never)
    .eq("id", session.id);

  const handoff = session.alux_mode === "alux" ? detectHandoffReason(msg.text) : null;
  if (handoff) {
    let name = line.owner_business_id ? "Un cliente" : "Un prospecto";
    if (session.business_contact_id) {
      const { data: c } = await admin
        .from("business_whatsapp_contacts")
        .select("first_name")
        .eq("id", session.business_contact_id)
        .maybeSingle();
      if (c?.first_name && c.first_name !== "Contacto de WhatsApp") name = c.first_name;
    }
    if (session.prospect_id) {
      const { data: p } = await admin
        .from("concierge_prospects")
        .select("first_name")
        .eq("id", session.prospect_id)
        .maybeSingle();
      if (p?.first_name && p.first_name !== "Contacto de WhatsApp") name = p.first_name;
    }
    await startHandoff(admin, session, handoff, name, line);
  }
  if (session.alux_mode === "human" && !handoff) return; // el concierge atiende
  await replyAsAlux(admin, line, session.id, handoff, deps);
}

/* ─────────────────────────── Entrada principal ─────────────────────────── */

export async function processInboxRow(
  admin: Admin,
  row: InboxRow,
  deps: ProcessDeps = {},
): Promise<{ ok: boolean; error?: string }> {
  const full: Required<ProcessDeps> = {
    channel: deps.channel ?? evolutionChannel,
    compose: deps.compose ?? composeWhatsAppReply,
    composeBusiness: deps.composeBusiness ?? composeBusinessWhatsAppReply,
  };
  try {
    const { data: line, error } = await admin
      .from("crm_whatsapp_lines")
      .select(LINE_COLUMNS)
      .eq("id", row.line_id)
      .maybeSingle();
    if (error) throw new Error(`line_read_failed: ${error.message}`);
    if (line) {
      const data = (row.payload ?? {})["data"];
      if (row.event === "connection.update")
        await handleConnection(admin, line as LineRow, data, full.channel);
      else if (row.event === "qrcode.updated") await handleQr(admin, line as LineRow, data);
      else if (row.event === "messages.upsert")
        await handleMessage(admin, line as LineRow, data, full);
    }
    await admin
      .from("crm_whatsapp_inbox")
      .update({
        processed_at: new Date().toISOString(),
        processing_error: null,
        lease_until: null,
      } as never)
      .eq("id", row.id);
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message.slice(0, 900) : "processing_failed";
    const backoffMin = Math.min(60, 2 ** Math.min(row.attempts, 6));
    await admin
      .from("crm_whatsapp_inbox")
      .update({
        processing_error: message,
        lease_until: null,
        next_attempt_at: new Date(Date.now() + backoffMin * 60_000).toISOString(),
      } as never)
      .eq("id", row.id);
    console.error("crm whatsapp processing failed", { id: row.id, error: message.slice(0, 200) });
    return { ok: false, error: message };
  }
}

/** Procesa un aviso concreto (al llegar) o un lote de pendientes (recuperación). */
export async function processPending(
  admin: Admin,
  opts: { id?: string; limit?: number; deps?: ProcessDeps } = {},
): Promise<{ processed: number; failed: number }> {
  const { data, error } = await admin.rpc("crm_whatsapp_claim_inbox", {
    _id: (opts.id ?? null) as unknown as string,
    _limit: opts.limit ?? 5,
    _lease_seconds: 90,
  });
  if (error) throw new Error(`claim_failed: ${error.message}`);
  let processed = 0;
  let failed = 0;
  for (const row of (data ?? []) as unknown as InboxRow[]) {
    const r = await processInboxRow(admin, row, opts.deps);
    if (r.ok) processed++;
    else failed++;
  }
  return { processed, failed };
}
