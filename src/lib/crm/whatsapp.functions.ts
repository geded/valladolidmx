/**
 * CRM Prospectos · Fase 2 · funciones de WhatsApp (propuesta 19.48).
 *
 * - Líneas (crear, QR, estado, desvincular, Alux sí/no): sólo administradores.
 * - Escribir desde el panel y devolver/tomar la plática: equipo concierge.
 *
 * Los permisos se verifican con la sesión del usuario antes de usar el
 * cliente de servicio, que sólo se carga dentro de cada función.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = {
  supabase: { rpc: (fn: never, args: never) => PromiseLike<{ data: unknown; error: unknown }> };
  userId: string;
};

async function assertStaff(context: Ctx) {
  const { data, error } = await context.supabase.rpc(
    "crm_is_prospect_staff" as never,
    { _user_id: context.userId } as never,
  );
  if (error || data !== true) throw new Error("forbidden");
}

async function assertAdmin(context: Ctx) {
  for (const role of ["admin", "super_admin"]) {
    const { data } = await context.supabase.rpc(
      "has_role" as never,
      { _user_id: context.userId, _role: role } as never,
    );
    if (data === true) return;
  }
  throw new Error("forbidden");
}

function friendlyError(e: unknown): string {
  const msg = e instanceof Error ? e.message : "";
  if (msg.includes("no está configurado")) return "El servidor de mensajes no está configurado.";
  if (msg.startsWith("Servidor de mensajes")) return msg.slice(0, 240);
  return "No se pudo completar la operación con WhatsApp.";
}

export type WhatsAppLineRow = {
  id: string;
  label: string;
  instance_name: string;
  status: "pending" | "connecting" | "connected" | "disconnected";
  phone_e164: string | null;
  profile_name: string | null;
  alux_enabled: boolean;
  last_state_at: string | null;
  qr_updated_at: string | null;
  webhook_base_url: string | null;
  created_at: string;
};

export const listWhatsAppLines = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context as never);
    const { data, error } = await context.supabase
      .from("crm_whatsapp_lines")
      .select(
        "id, label, instance_name, status, phone_e164, profile_name, alux_enabled, last_state_at, qr_updated_at, webhook_base_url, created_at",
      )
      .is("owner_business_id", null)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    const { data: isSuper } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "super_admin",
    });
    return {
      lines: (data ?? []) as WhatsAppLineRow[],
      canManage: isAdmin === true || isSuper === true,
    };
  });

async function currentWebhook(): Promise<{ origin: string; url: string }> {
  const [{ getRequest }, rules] = await Promise.all([
    import("@tanstack/react-start/server"),
    import("@/lib/crm/whatsapp/rules"),
  ]);
  const token = process.env["EVOLUTION_WEBHOOK_TOKEN"] ?? "";
  if (token.length < 32) throw new Error("El servidor de mensajes no está configurado.");
  const req = getRequest();
  const origin = rules.resolveWebhookOrigin(req.headers.get("origin") ?? new URL(req.url).origin);
  return { origin, url: rules.webhookUrl(origin, token) };
}

export const createWhatsAppLine = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ label: z.string().trim().min(2).max(80) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const [{ supabaseAdmin }, { evolutionChannel }, rules, { randomBytes }] = await Promise.all([
      import("@/integrations/supabase/client.server"),
      import("@/lib/crm/channel/evolution.server"),
      import("@/lib/crm/whatsapp/rules"),
      import("node:crypto"),
    ]);
    const instanceName = rules.makeInstanceName(data.label, randomBytes(4).toString("hex"));
    let hook: { origin: string; url: string };
    try {
      hook = await currentWebhook();
    } catch (e) {
      return { ok: false as const, error: friendlyError(e) };
    }
    const { data: line, error } = await supabaseAdmin
      .from("crm_whatsapp_lines")
      .insert({
        instance_name: instanceName,
        label: data.label,
        status: "connecting",
        webhook_base_url: hook.origin,
        created_by: context.userId,
      } as never)
      .select("id")
      .single();
    if (error || !line) return { ok: false as const, error: "No se pudo guardar la línea." };
    try {
      const qr = await evolutionChannel.createLine(instanceName, hook.url);
      if (qr.imageDataUrl) {
        await supabaseAdmin
          .from("crm_whatsapp_lines")
          .update({ qr_code: qr.imageDataUrl, qr_updated_at: new Date().toISOString() } as never)
          .eq("id", line.id);
      }
      return {
        ok: true as const,
        lineId: line.id as string,
        qr: qr.imageDataUrl,
        pairingCode: qr.pairingCode,
      };
    } catch (e) {
      await supabaseAdmin
        .from("crm_whatsapp_lines")
        .update({ status: "disconnected" } as never)
        .eq("id", line.id);
      return { ok: false as const, error: friendlyError(e) };
    }
  });

export const refreshWhatsAppLine = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), newQr: z.boolean().default(false) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const [{ supabaseAdmin }, { evolutionChannel }, rules] = await Promise.all([
      import("@/integrations/supabase/client.server"),
      import("@/lib/crm/channel/evolution.server"),
      import("@/lib/crm/whatsapp/rules"),
    ]);
    const { data: line } = await supabaseAdmin
      .from("crm_whatsapp_lines")
      .select("id, instance_name, qr_code, qr_updated_at")
      .eq("id", data.id)
      .maybeSingle();
    if (!line) return { ok: false as const, error: "La línea no existe." };
    try {
      const info = await evolutionChannel.info(line.instance_name);
      const status = rules.mapConnectionState(info.state) ?? "disconnected";
      const patch: Record<string, unknown> = {
        status,
        last_state_at: new Date().toISOString(),
      };
      let qr: string | null = null;
      let pairingCode: string | null = null;
      if (status === "connected") {
        patch["qr_code"] = null;
        const phone = rules.jidToE164(info.ownerJid);
        if (phone) patch["phone_e164"] = phone;
        if (info.profileName) patch["profile_name"] = info.profileName;
      } else if (data.newQr) {
        const fresh = await evolutionChannel.connect(line.instance_name);
        qr = fresh.imageDataUrl;
        pairingCode = fresh.pairingCode;
        if (qr) {
          patch["qr_code"] = qr;
          patch["qr_updated_at"] = new Date().toISOString();
          patch["status"] = "connecting";
        }
      } else {
        const age = line.qr_updated_at ? Date.now() - Date.parse(line.qr_updated_at) : Infinity;
        qr = age < 60_000 ? line.qr_code : null;
      }
      await supabaseAdmin
        .from("crm_whatsapp_lines")
        .update(patch as never)
        .eq("id", line.id);
      return { ok: true as const, status: patch["status"] as string, qr, pairingCode };
    } catch (e) {
      return { ok: false as const, error: friendlyError(e) };
    }
  });

export const repointWhatsAppLine = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const [{ supabaseAdmin }, { evolutionChannel }] = await Promise.all([
      import("@/integrations/supabase/client.server"),
      import("@/lib/crm/channel/evolution.server"),
    ]);
    const { data: line } = await supabaseAdmin
      .from("crm_whatsapp_lines")
      .select("id, instance_name")
      .eq("id", data.id)
      .maybeSingle();
    if (!line) return { ok: false as const, error: "La línea no existe." };
    try {
      const hook = await currentWebhook();
      await evolutionChannel.setWebhook(line.instance_name, hook.url);
      await supabaseAdmin
        .from("crm_whatsapp_lines")
        .update({ webhook_base_url: hook.origin } as never)
        .eq("id", line.id);
      return { ok: true as const, origin: hook.origin };
    } catch (e) {
      return { ok: false as const, error: friendlyError(e) };
    }
  });

export const disconnectWhatsAppLine = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const [{ supabaseAdmin }, { evolutionChannel }] = await Promise.all([
      import("@/integrations/supabase/client.server"),
      import("@/lib/crm/channel/evolution.server"),
    ]);
    const { data: line } = await supabaseAdmin
      .from("crm_whatsapp_lines")
      .select("id, instance_name")
      .eq("id", data.id)
      .maybeSingle();
    if (!line) return { ok: false as const, error: "La línea no existe." };
    try {
      await evolutionChannel.logout(line.instance_name);
    } catch (e) {
      const status = (e as { status?: number }).status;
      if (status !== 400 && status !== 404) return { ok: false as const, error: friendlyError(e) };
    }
    await supabaseAdmin
      .from("crm_whatsapp_lines")
      .update({
        status: "disconnected",
        qr_code: null,
        last_state_at: new Date().toISOString(),
      } as never)
      .eq("id", line.id);
    return { ok: true as const };
  });

export const setWhatsAppLineAlux = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), enabled: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("crm_whatsapp_lines")
      .update({ alux_enabled: data.enabled } as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ─────────────────────────── Plática desde el panel ─────────────────────────── */

export const setWhatsAppConversationMode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ sessionId: z.string().uuid(), mode: z.enum(["alux", "human"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: Record<string, unknown> = { alux_mode: data.mode };
    if (data.mode === "alux") {
      patch["handoff_requested_at"] = null;
      patch["handoff_reason"] = null;
    }
    const { data: s, error } = await supabaseAdmin
      .from("alux_public_sessions")
      .update(patch as never)
      .eq("id", data.sessionId)
      .eq("channel", "whatsapp")
      .select("id, prospect_id")
      .maybeSingle();
    if (error || !s) throw new Error("La plática no es de WhatsApp.");
    await supabaseAdmin.from("alux_public_messages").insert({
      session_id: s.id,
      ip_hash: "whatsapp",
      role: "assistant",
      author: "system",
      channel: "whatsapp",
      created_by: context.userId,
      content:
        data.mode === "alux"
          ? "Un concierge devolvió la plática a Alux desde el panel."
          : "Un concierge tomó la plática desde el panel; Alux deja de contestar.",
    } as never);
    return { ok: true };
  });

export const sendWhatsAppFromPanel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        sessionId: z.string().uuid(),
        text: z.string().trim().min(1).max(2000),
        translate: z.boolean().default(true),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context as never);
    const [{ supabaseAdmin }, { evolutionChannel }, reply, rules] = await Promise.all([
      import("@/integrations/supabase/client.server"),
      import("@/lib/crm/channel/evolution.server"),
      import("@/lib/crm/whatsapp/alux-reply.server"),
      import("@/lib/crm/whatsapp/rules"),
    ]);
    const { data: s } = await supabaseAdmin
      .from("alux_public_sessions")
      .select("id, prospect_id, wa_remote_jid, whatsapp_line_id, conversation_language, channel")
      .eq("id", data.sessionId)
      .maybeSingle();
    if (!s || s.channel !== "whatsapp" || !s.wa_remote_jid || !s.whatsapp_line_id) {
      return { ok: false as const, error: "Esta plática no es de WhatsApp." };
    }
    const { data: line } = await supabaseAdmin
      .from("crm_whatsapp_lines")
      .select("instance_name, status")
      .eq("id", s.whatsapp_line_id)
      .maybeSingle();
    if (!line || line.status !== "connected") {
      return { ok: false as const, error: "La línea de WhatsApp no está conectada." };
    }
    const lang = rules.toChatLanguage(s.conversation_language) ?? "es";
    const outgoing = data.translate ? await reply.translateForCustomer(data.text, lang) : data.text;

    await supabaseAdmin.rpc("crm_whatsapp_acquire_reply_lock", { _session_id: s.id, _seconds: 30 });
    let sentId: string | null = null;
    let sendError: string | null = null;
    try {
      sentId = (await evolutionChannel.sendText(line.instance_name, s.wa_remote_jid, outgoing)).id;
    } catch (e) {
      sendError = friendlyError(e);
    }
    const now = new Date().toISOString();
    await supabaseAdmin.from("alux_public_messages").insert({
      session_id: s.id,
      ip_hash: "whatsapp",
      role: "assistant",
      author: "concierge",
      channel: "whatsapp",
      content: outgoing,
      original_text: outgoing !== data.text ? data.text : null,
      external_id: sentId,
      send_status: sendError ? "failed" : "accepted",
      created_by: context.userId,
    } as never);
    await supabaseAdmin
      .from("alux_public_sessions")
      .update({ alux_mode: "human", human_reply_at: now, reply_lock_until: null } as never)
      .eq("id", s.id);
    if (s.prospect_id && !sendError) {
      const { data: p } = await supabaseAdmin
        .from("concierge_prospects")
        .select("stage")
        .eq("id", s.prospect_id)
        .maybeSingle();
      await supabaseAdmin
        .from("concierge_prospects")
        .update({
          last_activity_at: now,
          ...(p?.stage === "nuevo" ? { stage: "contactado" } : {}),
        } as never)
        .eq("id", s.prospect_id);
    }
    if (sendError) return { ok: false as const, error: sendError };
    return { ok: true as const, translated: outgoing !== data.text };
  });

/** Traducción al español para leer la plática («Ver en español»). */
export const translateTranscriptToSpanish = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ texts: z.array(z.string().max(2000)).min(1).max(40) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context as never);
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { texts: data.texts };
    const [{ generateText }, { createLovableAiGatewayProvider }] = await Promise.all([
      import("ai"),
      import("@/lib/ai-gateway.server"),
    ]);
    try {
      const provider = createLovableAiGatewayProvider(apiKey);
      const { text } = await generateText({
        model: provider("google/gemini-3-flash-preview"),
        system:
          "Traduce al español cada mensaje del arreglo JSON, en el mismo orden. Si ya está en español, déjalo igual. Conserva nombres propios, enlaces y números. Responde sólo con un arreglo JSON de cadenas.",
        prompt: JSON.stringify(data.texts),
        temperature: 0.1,
        abortSignal: AbortSignal.timeout(20_000),
      });
      const start = text.indexOf("[");
      const end = text.lastIndexOf("]");
      const arr = JSON.parse(text.slice(start, end + 1)) as unknown[];
      if (Array.isArray(arr) && arr.length === data.texts.length) {
        return { texts: arr.map((t, i) => (typeof t === "string" ? t : data.texts[i]!)) };
      }
    } catch {
      /* se muestra el original */
    }
    return { texts: data.texts };
  });
