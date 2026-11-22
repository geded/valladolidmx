/**
 * Portal Empresarial · Fase 5 · WhatsApp de la empresa con Alux.
 *
 * Cada empresa conecta su propio número por QR (misma conexión de
 * Valladolid.mx, líneas `vmx-biz-*`). Alux contesta ahí con la personalidad y
 * reglas de la Consola de Alux y sólo con los datos de esa empresa. Los
 * contactos y pláticas son de la empresa: no entran a CRM Prospectos.
 *
 * Permisos (siempre con la sesión del usuario, antes de usar el cliente de
 * servicio): ver = viewer; editar presentación, preguntas, contactos y
 * escribir = editor; conectar o desvincular el número = manager.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { BUSINESS_CONTACT_STAGES } from "@/lib/crm/whatsapp/business-rules";

type Role = "viewer" | "editor" | "manager";
type Ctx = {
  supabase: { rpc: (fn: never, args: never) => PromiseLike<{ data: unknown; error: unknown }> };
  userId: string;
};

async function hasAccess(context: Ctx, businessId: string, role: Role): Promise<boolean> {
  const { data, error } = await context.supabase.rpc(
    "has_business_access" as never,
    { _user_id: context.userId, _business_id: businessId, _min_role: role } as never,
  );
  return !error && data === true;
}

async function ensure(context: Ctx, businessId: string, role: Role) {
  if (!(await hasAccess(context, businessId, role))) throw new Error("forbidden_business_access");
}

function friendlyError(e: unknown): string {
  const msg = e instanceof Error ? e.message : "";
  if (msg.includes("no está configurado")) return "El servidor de mensajes no está configurado.";
  if (msg.startsWith("Servidor de mensajes")) return msg.slice(0, 240);
  return "No se pudo completar la operación con WhatsApp.";
}

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

const businessInput = z.object({ businessId: z.string().uuid() });

export type BusinessWhatsAppLine = {
  id: string;
  label: string;
  status: "pending" | "connecting" | "connected" | "disconnected";
  phone_e164: string | null;
  profile_name: string | null;
  alux_enabled: boolean;
  last_state_at: string | null;
  alux_greeting: string | null;
  alux_tone: "cercano" | "formal";
  alux_highlights: string | null;
};

const LINE_SELECT =
  "id, label, status, phone_e164, profile_name, alux_enabled, last_state_at, alux_greeting, alux_tone, alux_highlights";

async function lineFor(businessId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("crm_whatsapp_lines")
    .select(`${LINE_SELECT}, instance_name, qr_code, qr_updated_at`)
    .eq("owner_business_id", businessId)
    .maybeSingle();
  return {
    supabaseAdmin,
    line: data as
      | (BusinessWhatsAppLine & {
          instance_name: string;
          qr_code: string | null;
          qr_updated_at: string | null;
        })
      | null,
  };
}

/* ─────────────────────────── Resumen ─────────────────────────── */

export const getBusinessWhatsApp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => businessInput.parse(d))
  .handler(async ({ data, context }) => {
    await ensure(context as never, data.businessId, "viewer");
    const [canEdit, canManage] = await Promise.all([
      hasAccess(context as never, data.businessId, "editor"),
      hasAccess(context as never, data.businessId, "manager"),
    ]);
    const [{ supabaseAdmin, line }, ctxMod, rules, channels] = await Promise.all([
      lineFor(data.businessId),
      import("@/lib/crm/whatsapp/business-context.server"),
      import("@/lib/crm/whatsapp/business-rules"),
      import("@/lib/alux/channels.server"),
    ]);
    const [ctx, ch] = await Promise.all([
      ctxMod.loadBusinessWhatsAppContext(supabaseAdmin, data.businessId),
      channels.readAluxChannelsServer(supabaseAdmin),
    ]);
    if (!ctx) throw new Error("business_not_found");
    const {
      instance_name: _i,
      qr_code: _q,
      qr_updated_at: _u,
      ...publicLine
    } = line ?? ({} as never);
    void _i;
    void _q;
    void _u;
    return {
      line: line ? (publicLine as BusinessWhatsAppLine) : null,
      canEdit,
      canManage,
      whatsappChannelOn: ch.whatsapp,
      businessName: ctx.name,
      defaultPresentation: rules.defaultPresentation(ctx.name, ctx.destinationName),
      knows: {
        description: Boolean(ctx.description || ctx.tagline),
        products: ctx.products.length,
        productsWithPrice: ctx.products.filter((p) => rules.productPriceText(p) !== null).length,
        hours: Boolean(rules.hoursText(ctx.hours)),
        location: Boolean(ctx.address || ctx.mapsUrl),
        faqs: ctx.faqs.length,
      },
    };
  });

/* ─────────────────────────── Conexión ─────────────────────────── */

export const createBusinessWhatsAppLine = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => businessInput.parse(d))
  .handler(async ({ data, context }) => {
    await ensure(context as never, data.businessId, "manager");
    const [{ supabaseAdmin, line: existing }, { evolutionChannel }, bizRules, { randomBytes }] =
      await Promise.all([
        lineFor(data.businessId),
        import("@/lib/crm/channel/evolution.server"),
        import("@/lib/crm/whatsapp/business-rules"),
        import("node:crypto"),
      ]);
    if (existing)
      return { ok: false as const, error: "Tu empresa ya tiene un WhatsApp; usa «Mostrar QR»." };
    const { data: biz } = await supabaseAdmin
      .from("businesses")
      .select("slug, display_name")
      .eq("id", data.businessId)
      .is("deleted_at", null)
      .maybeSingle();
    if (!biz) return { ok: false as const, error: "La empresa no existe." };
    let hook: { origin: string; url: string };
    try {
      hook = await currentWebhook();
    } catch (e) {
      return { ok: false as const, error: friendlyError(e) };
    }
    const instanceName = bizRules.makeBusinessInstanceName(
      String(biz.slug ?? "empresa"),
      randomBytes(4).toString("hex"),
    );
    const { data: line, error } = await supabaseAdmin
      .from("crm_whatsapp_lines")
      .insert({
        instance_name: instanceName,
        label: `WhatsApp de ${String(biz.display_name ?? biz.slug)}`.slice(0, 80),
        status: "connecting",
        webhook_base_url: hook.origin,
        created_by: context.userId,
        owner_business_id: data.businessId,
      } as never)
      .select("id")
      .single();
    if (error || !line) return { ok: false as const, error: "No se pudo guardar el WhatsApp." };
    try {
      const qr = await evolutionChannel.createLine(instanceName, hook.url);
      if (qr.imageDataUrl) {
        await supabaseAdmin
          .from("crm_whatsapp_lines")
          .update({ qr_code: qr.imageDataUrl, qr_updated_at: new Date().toISOString() } as never)
          .eq("id", line.id);
      }
      return { ok: true as const, qr: qr.imageDataUrl, pairingCode: qr.pairingCode };
    } catch (e) {
      await supabaseAdmin
        .from("crm_whatsapp_lines")
        .update({ status: "disconnected" } as never)
        .eq("id", line.id);
      return { ok: false as const, error: friendlyError(e) };
    }
  });

export const refreshBusinessWhatsAppLine = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    businessInput.extend({ newQr: z.boolean().default(false) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await ensure(context as never, data.businessId, "manager");
    const [{ supabaseAdmin, line }, { evolutionChannel }, rules] = await Promise.all([
      lineFor(data.businessId),
      import("@/lib/crm/channel/evolution.server"),
      import("@/lib/crm/whatsapp/rules"),
    ]);
    if (!line) return { ok: false as const, error: "Tu empresa todavía no tiene WhatsApp." };
    try {
      const info = await evolutionChannel.info(line.instance_name);
      const status = rules.mapConnectionState(info.state) ?? "disconnected";
      const patch: Record<string, unknown> = { status, last_state_at: new Date().toISOString() };
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
      // Los avisos siempre llegan al sitio desde donde se conecta.
      if (status !== "connected" && data.newQr) {
        const hook = await currentWebhook().catch(() => null);
        if (hook) {
          await evolutionChannel.setWebhook(line.instance_name, hook.url).catch(() => undefined);
          patch["webhook_base_url"] = hook.origin;
        }
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

export const disconnectBusinessWhatsAppLine = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => businessInput.parse(d))
  .handler(async ({ data, context }) => {
    await ensure(context as never, data.businessId, "manager");
    const [{ supabaseAdmin, line }, { evolutionChannel }] = await Promise.all([
      lineFor(data.businessId),
      import("@/lib/crm/channel/evolution.server"),
    ]);
    if (!line) return { ok: false as const, error: "Tu empresa todavía no tiene WhatsApp." };
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

export const setBusinessWhatsAppAlux = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => businessInput.extend({ enabled: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await ensure(context as never, data.businessId, "manager");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("crm_whatsapp_lines")
      .update({ alux_enabled: data.enabled } as never)
      .eq("owner_business_id", data.businessId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ─────────────────────────── Cómo se presenta ─────────────────────────── */

export const saveBusinessAluxPresentation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    businessInput
      .extend({
        greeting: z.string().trim().max(400),
        tone: z.enum(["cercano", "formal"]),
        highlights: z.string().trim().max(600),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await ensure(context as never, data.businessId, "editor");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("crm_whatsapp_lines")
      .update({
        alux_greeting: data.greeting || null,
        alux_tone: data.tone,
        alux_highlights: data.highlights || null,
        updated_at: new Date().toISOString(),
      } as never)
      .eq("owner_business_id", data.businessId)
      .select("id");
    if (error) throw new Error(error.message);
    if (!rows?.length)
      return { ok: false as const, error: "Primero conecta el WhatsApp de tu empresa." };
    return { ok: true as const };
  });

/** Prueba a Alux con una pregunta sin mandar nada por WhatsApp. */
export const previewBusinessAlux = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    businessInput
      .extend({
        question: z.string().trim().min(2).max(600),
        greeting: z.string().trim().max(400).optional(),
        tone: z.enum(["cercano", "formal"]).optional(),
        highlights: z.string().trim().max(600).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await ensure(context as never, data.businessId, "editor");
    const [{ supabaseAdmin, line }, ctxMod, reply, rules] = await Promise.all([
      lineFor(data.businessId),
      import("@/lib/crm/whatsapp/business-context.server"),
      import("@/lib/crm/whatsapp/alux-reply.server"),
      import("@/lib/crm/whatsapp/business-rules"),
    ]);
    const business = await ctxMod.loadBusinessWhatsAppContext(supabaseAdmin, data.businessId);
    if (!business) return { ok: false as const, error: "La empresa no existe." };
    try {
      const r = await reply.composeBusinessWhatsAppReply({
        pending: [data.question],
        history: [],
        firstName: null,
        language: null,
        otherChannelMemory: [],
        tripItems: [],
        handoff: null,
        isFirstReply: true,
        mediaOnly: false,
        business,
        presentation: {
          greeting: (data.greeting ?? line?.alux_greeting ?? "") || null,
          tone: rules.normalizeTone(data.tone ?? line?.alux_tone),
          highlights: (data.highlights ?? line?.alux_highlights ?? "") || null,
        },
      });
      return { ok: true as const, text: r.text, handoff: r.handoff };
    } catch {
      return { ok: false as const, error: "Alux no pudo contestar la prueba en este momento." };
    }
  });

/* ─────────────────────────── Preguntas y respuestas ─────────────────────────── */

export type BusinessFaqRow = {
  id: string;
  question: string;
  answer: string;
  status: "draft" | "published" | "archived";
  category: string | null;
  updated_at: string;
};

export const listBusinessAluxFaqs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => businessInput.parse(d))
  .handler(async ({ data, context }) => {
    await ensure(context as never, data.businessId, "viewer");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("faqs")
      .select("id, question, answer, status, category, updated_at")
      .eq("entity_kind", "business")
      .eq("entity_id", data.businessId)
      .is("deleted_at", null)
      .order("position")
      .order("created_at")
      .limit(200);
    if (error) throw new Error(error.message);
    return (rows ?? []) as BusinessFaqRow[];
  });

export const saveBusinessAluxFaq = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    businessInput
      .extend({
        id: z.string().uuid().optional(),
        question: z.string().trim().min(3).max(300),
        answer: z.string().trim().min(1).max(1500),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await ensure(context as never, data.businessId, "editor");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = new Date().toISOString();
    const row = {
      question: data.question,
      answer: data.answer,
      status: "published",
      category: "alux",
      published_at: now,
      updated_by: context.userId,
    };
    if (data.id) {
      const { data: upd, error } = await supabaseAdmin
        .from("faqs")
        .update(row as never)
        .eq("id", data.id)
        .eq("entity_kind", "business")
        .eq("entity_id", data.businessId)
        .is("deleted_at", null)
        .select("id");
      if (error || !upd?.length) throw new Error("No se pudo guardar la respuesta.");
      return { ok: true };
    }
    const { error } = await supabaseAdmin.from("faqs").insert({
      ...row,
      entity_kind: "business",
      entity_id: data.businessId,
      locale: "es",
      position: 100,
      created_by: context.userId,
    } as never);
    if (error) throw new Error("No se pudo guardar la pregunta.");
    return { ok: true };
  });

export const deleteBusinessAluxFaq = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => businessInput.extend({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await ensure(context as never, data.businessId, "editor");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("faqs")
      .update({ deleted_at: new Date().toISOString(), deleted_by: context.userId } as never)
      .eq("id", data.id)
      .eq("entity_kind", "business")
      .eq("entity_id", data.businessId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ─────────────────────────── Pláticas y contactos ─────────────────────────── */

export type BusinessChatRow = {
  id: string;
  last_seen_at: string;
  message_count: number;
  alux_mode: "alux" | "human";
  handoff_requested_at: string | null;
  conversation_language: string | null;
  contact: {
    id: string;
    first_name: string;
    phone_e164: string;
    stage: string;
    notes: string | null;
  } | null;
};

export const listBusinessWhatsAppChats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => businessInput.parse(d))
  .handler(async ({ data, context }) => {
    await ensure(context as never, data.businessId, "viewer");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("alux_public_sessions")
      .select(
        "id, last_seen_at, message_count, alux_mode, handoff_requested_at, conversation_language, contact:business_whatsapp_contacts!alux_public_sessions_business_contact_id_fkey ( id, first_name, phone_e164, stage, notes )",
      )
      .eq("owner_business_id", data.businessId)
      .eq("channel", "whatsapp")
      .order("last_seen_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return (rows ?? []) as unknown as BusinessChatRow[];
  });

export const getBusinessWhatsAppChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => businessInput.extend({ sessionId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await ensure(context as never, data.businessId, "viewer");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: s } = await supabaseAdmin
      .from("alux_public_sessions")
      .select("id")
      .eq("id", data.sessionId)
      .eq("owner_business_id", data.businessId)
      .maybeSingle();
    if (!s) throw new Error("not_found");
    const { data: msgs, error } = await supabaseAdmin
      .from("alux_public_messages")
      .select("id, role, author, content, created_at, send_status")
      .eq("session_id", data.sessionId)
      .order("created_at", { ascending: true })
      .limit(300);
    if (error) throw new Error(error.message);
    return (msgs ?? []) as Array<{
      id: string;
      role: "user" | "assistant";
      author: string | null;
      content: string;
      created_at: string;
      send_status: string | null;
    }>;
  });

export const updateBusinessWhatsAppContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    businessInput
      .extend({
        contactId: z.string().uuid(),
        stage: z.enum(BUSINESS_CONTACT_STAGES).optional(),
        notes: z.string().trim().max(2000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await ensure(context as never, data.businessId, "editor");
    const patch: Record<string, unknown> = {};
    if (data.stage) patch["stage"] = data.stage;
    if (data.notes !== undefined) patch["notes"] = data.notes || null;
    if (!Object.keys(patch).length) return { ok: true };
    // Con la sesión del usuario: la política de la tabla vuelve a revisar el permiso.
    const sb = context.supabase as unknown as {
      from: (t: string) => {
        update: (p: unknown) => {
          eq: (
            a: string,
            b: string,
          ) => {
            eq: (a: string, b: string) => PromiseLike<{ error: { message: string } | null }>;
          };
        };
      };
    };
    const { error } = await sb
      .from("business_whatsapp_contacts")
      .update(patch)
      .eq("id", data.contactId)
      .eq("business_id", data.businessId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
