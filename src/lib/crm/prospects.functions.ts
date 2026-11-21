/**
 * CRM Prospectos · funciones de servidor (Fase 1, propuesta 19.48).
 *
 * - `submitAluxProspectContact`: pública. La persona escribe su nombre y
 *   WhatsApp en la tarjeta de Alux y acepta el permiso; el servidor valida y
 *   llama a `crm_capture_prospect` (sólo service role), que crea o actualiza
 *   el prospecto, lo liga a la plática y avisa al equipo sin el teléfono.
 * - El resto exige sesión y rol del equipo concierge; leen y escriben con
 *   RLS como el propio usuario (`context.supabase`).
 *
 * El modelo de Alux nunca recibe el teléfono ni el correo.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  CONTACT_OFFER_REASONS,
  PROSPECT_CONSENT_TEXT,
  PROSPECT_STAGES,
  PROSPECT_TEMPERATURES,
  cleanFirstName,
  normalizeWhatsApp,
} from "./prospect-rules";

const LOCALES = ["es", "en", "fr", "de", "it", "pt"] as const;

const TripItemSnapshotSchema = z.object({
  kind: z.string().min(1).max(40),
  targetId: z.string().max(128).nullable().optional(),
  title: z.string().max(180).nullable().optional(),
});

const SubmitContactSchema = z.object({
  sessionKey: z.string().min(8).max(128),
  firstName: z.string().min(1).max(80),
  whatsapp: z.string().min(6).max(32),
  consent: z.literal(true),
  locale: z.enum(LOCALES).optional(),
  reason: z.enum(CONTACT_OFFER_REASONS).optional(),
  destinationSlug: z.string().max(128).nullable().optional(),
  trip: z
    .object({
      destinations: z.array(z.string().max(128)).max(12).optional(),
      interests: z.array(z.string().max(60)).max(16).optional(),
      partySize: z.number().int().min(1).max(60).nullable().optional(),
      startDate: z.string().max(20).nullable().optional(),
      endDate: z.string().max(20).nullable().optional(),
      durationDays: z.number().min(0.5).max(60).nullable().optional(),
      items: z.array(TripItemSnapshotSchema).max(30).optional(),
    })
    .optional(),
});

export type SubmitProspectContactInput = z.infer<typeof SubmitContactSchema>;

export const submitAluxProspectContact = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => SubmitContactSchema.parse(d ?? {}))
  .handler(async ({ data }) => {
    const firstName = cleanFirstName(data.firstName);
    if (!firstName) return { ok: false as const, error: "invalid_name" as const };
    const phone = normalizeWhatsApp(data.whatsapp);
    if (!phone) return { ok: false as const, error: "invalid_whatsapp" as const };

    const trip = data.trip ?? {};
    const brief: Record<string, unknown> = {};
    if (trip.destinations?.length) brief["destinations"] = trip.destinations;
    if (trip.interests?.length) brief["interests"] = trip.interests;
    if (trip.partySize) brief["partySize"] = trip.partySize;
    if (trip.startDate) brief["startDate"] = trip.startDate;
    if (trip.endDate) brief["endDate"] = trip.endDate;
    if (trip.durationDays) brief["durationDays"] = trip.durationDays;
    const items = (trip.items ?? []).map((it) => ({
      kind: it.kind,
      targetId: it.targetId ?? null,
      title: it.title ?? null,
    }));

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin.rpc("crm_capture_prospect", {
      _session_key: data.sessionKey,
      _first_name: firstName,
      _phone_e164: phone,
      _language: data.locale ?? "es",
      _reason: data.reason ?? "followup",
      _destination_slug: data.destinationSlug ?? (trip.destinations?.[0] ?? null),
      _trip_brief: brief as never,
      _trip_items: items as never,
      _consent_text: PROSPECT_CONSENT_TEXT,
    });
    if (error) {
      const code = /session_not_found/.test(error.message)
        ? "session_not_found"
        : /too_many_attempts/.test(error.message)
          ? "too_many_attempts"
          : "unavailable";
      if (code === "unavailable") console.error("[crm.capture] fallo", error.message);
      return { ok: false as const, error: code };
    }
    const row = Array.isArray(rows) ? rows[0] : rows;
    try {
      const { dispatchPendingPush } = await import("@/lib/notifications/push-dispatch.server");
      await dispatchPendingPush({ limit: 25 });
    } catch {
      /* el aviso al celular no bloquea la captura; queda pendiente */
    }
    return { ok: true as const, firstName, isNew: Boolean(row?.is_new) };
  });

/* ───────────────────────── equipo concierge ───────────────────────── */

async function assertStaff(context: {
  supabase: { rpc: (fn: never, args: never) => PromiseLike<{ data: unknown; error: unknown }> };
  userId: string;
}) {
  const { data, error } = await context.supabase.rpc(
    "crm_is_prospect_staff" as never,
    { _user_id: context.userId } as never,
  );
  if (error || data !== true) throw new Error("forbidden");
}

const PROSPECT_COLUMNS =
  "id, created_at, updated_at, source, first_name, phone_e164, email, language, stage, temperature, capture_reason, destination_slug, trip_brief, trip_items, handoff_summary, assigned_concierge_user_id, reviewed_at, next_followup_at, last_activity_at, linked_user_id, lost_reason, consent_at";

export type ProspectRow = {
  id: string;
  created_at: string;
  updated_at: string;
  source: string;
  first_name: string;
  phone_e164: string;
  email: string | null;
  language: string;
  stage: (typeof PROSPECT_STAGES)[number];
  temperature: (typeof PROSPECT_TEMPERATURES)[number];
  capture_reason: (typeof CONTACT_OFFER_REASONS)[number] | null;
  destination_slug: string | null;
  trip_brief: Record<string, unknown>;
  trip_items: Array<{ kind: string; targetId: string | null; title: string | null }>;
  handoff_summary: string | null;
  assigned_concierge_user_id: string | null;
  reviewed_at: string | null;
  next_followup_at: string | null;
  last_activity_at: string;
  linked_user_id: string | null;
  lost_reason: string | null;
  consent_at: string;
};

export const listProspects = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        view: z.enum(["abiertos", "por_atender", "cerrados", "todos"]).default("abiertos"),
        search: z.string().max(80).optional(),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context as never);
    let q = context.supabase
      .from("concierge_prospects")
      .select(PROSPECT_COLUMNS)
      .order("last_activity_at", { ascending: false })
      .limit(200);
    if (data.view === "abiertos") q = q.not("stage", "in", "(no_interesado,perdido)");
    if (data.view === "por_atender") q = q.eq("stage", "nuevo");
    if (data.view === "cerrados") q = q.in("stage", ["no_interesado", "perdido"]);
    const term = data.search?.trim().replace(/[%,()]/g, "");
    if (term) q = q.or(`first_name.ilike.%${term}%,phone_e164.ilike.%${term}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []) as unknown as ProspectRow[];
  });

export const getProspectsToday = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context as never);
    const endOfDay = new Date();
    endOfDay.setUTCHours(23, 59, 59, 999);
    const [waiting, followups, hot] = await Promise.all([
      context.supabase
        .from("concierge_prospects")
        .select(PROSPECT_COLUMNS)
        .eq("stage", "nuevo")
        .is("reviewed_at", null)
        .order("last_activity_at", { ascending: true })
        .limit(50),
      context.supabase
        .from("concierge_prospects")
        .select(PROSPECT_COLUMNS)
        .not("next_followup_at", "is", null)
        .lte("next_followup_at", endOfDay.toISOString())
        .not("stage", "in", "(no_interesado,perdido,viajo,posventa)")
        .order("next_followup_at", { ascending: true })
        .limit(50),
      context.supabase
        .from("concierge_prospects")
        .select(PROSPECT_COLUMNS)
        .eq("temperature", "caliente")
        .is("assigned_concierge_user_id", null)
        .not("stage", "in", "(no_interesado,perdido)")
        .order("last_activity_at", { ascending: false })
        .limit(50),
    ]);
    for (const r of [waiting, followups, hot]) if (r.error) throw new Error(r.error.message);
    return {
      waiting: (waiting.data ?? []) as unknown as ProspectRow[],
      followups: (followups.data ?? []) as unknown as ProspectRow[],
      hotUnassigned: (hot.data ?? []) as unknown as ProspectRow[],
    };
  });

export type ProspectEventRow = {
  id: string;
  kind: string;
  actor_user_id: string | null;
  body: string | null;
  meta: Record<string, unknown>;
  created_at: string;
};

export type AluxTranscriptMessage = {
  id: string;
  session_id: string;
  role: string;
  content: string;
  created_at: string;
};

export const getProspect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context as never);
    const [prospectRes, eventsRes, sessionsRes] = await Promise.all([
      context.supabase
        .from("concierge_prospects")
        .select(PROSPECT_COLUMNS)
        .eq("id", data.id)
        .maybeSingle(),
      context.supabase
        .from("concierge_prospect_events")
        .select("id, kind, actor_user_id, body, meta, created_at")
        .eq("prospect_id", data.id)
        .order("created_at", { ascending: false })
        .limit(100),
      context.supabase
        .from("alux_public_sessions")
        .select("id, first_seen_at, last_seen_at, message_count, last_destination_slug")
        .eq("prospect_id", data.id)
        .order("last_seen_at", { ascending: false })
        .limit(10),
    ]);
    if (prospectRes.error) throw new Error(prospectRes.error.message);
    if (!prospectRes.data) return null;
    const sessions = sessionsRes.data ?? [];
    const sessionIds = sessions.map((s) => s.id);
    const messagesRes = sessionIds.length
      ? await context.supabase
          .from("alux_public_messages")
          .select("id, session_id, role, content, created_at")
          .in("session_id", sessionIds)
          .order("created_at", { ascending: true })
          .limit(400)
      : { data: [], error: null };
    if (messagesRes.error) throw new Error(messagesRes.error.message);
    return {
      prospect: prospectRes.data as unknown as ProspectRow,
      events: (eventsRes.data ?? []) as unknown as ProspectEventRow[],
      sessions,
      messages: (messagesRes.data ?? []) as AluxTranscriptMessage[],
    };
  });

const UpdateProspectSchema = z.object({
  id: z.string().uuid(),
  stage: z.enum(PROSPECT_STAGES).optional(),
  temperature: z.enum(PROSPECT_TEMPERATURES).optional(),
  assignToMe: z.boolean().optional(),
  release: z.boolean().optional(),
  reviewed: z.literal(true).optional(),
  nextFollowupAt: z.string().datetime().nullable().optional(),
  lostReason: z.string().max(500).nullable().optional(),
  firstName: z.string().min(1).max(80).optional(),
  email: z.string().email().max(254).nullable().optional(),
});

export const updateProspect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => UpdateProspectSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context as never);
    const patch: Record<string, unknown> = { last_activity_at: new Date().toISOString() };
    if (data.stage) patch["stage"] = data.stage;
    if (data.temperature) patch["temperature"] = data.temperature;
    if (data.assignToMe) patch["assigned_concierge_user_id"] = context.userId;
    if (data.release) patch["assigned_concierge_user_id"] = null;
    if (data.reviewed) {
      patch["reviewed_at"] = new Date().toISOString();
      patch["reviewed_by"] = context.userId;
    }
    if (data.nextFollowupAt !== undefined) patch["next_followup_at"] = data.nextFollowupAt;
    if (data.lostReason !== undefined) patch["lost_reason"] = data.lostReason;
    if (data.firstName) {
      const name = cleanFirstName(data.firstName);
      if (!name) throw new Error("invalid_name");
      patch["first_name"] = name;
    }
    if (data.email !== undefined) patch["email"] = data.email;
    const { error } = await context.supabase
      .from("concierge_prospects")
      .update(patch as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addProspectNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), body: z.string().trim().min(1).max(2000) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context as never);
    const { error } = await context.supabase.from("concierge_prospect_events").insert({
      prospect_id: data.id,
      kind: "note",
      actor_user_id: context.userId,
      body: data.body,
    });
    if (error) throw new Error(error.message);
    await context.supabase
      .from("concierge_prospects")
      .update({ last_activity_at: new Date().toISOString() } as never)
      .eq("id", data.id);
    return { ok: true };
  });

export type AluxConversationRow = {
  id: string;
  first_seen_at: string;
  last_seen_at: string;
  message_count: number;
  last_destination_slug: string | null;
  prospect_id: string | null;
  traveler_user_id: string | null;
  preview: string | null;
};

export const listAluxConversations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        days: z.number().int().min(1).max(90).default(7),
        filter: z.enum(["todas", "con_datos", "sin_datos"]).default("todas"),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context as never);
    const since = new Date(Date.now() - data.days * 86400000).toISOString();
    let q = context.supabase
      .from("alux_public_sessions")
      .select(
        "id, first_seen_at, last_seen_at, message_count, last_destination_slug, prospect_id, traveler_user_id",
      )
      .gte("last_seen_at", since)
      .gt("message_count", 0)
      .order("last_seen_at", { ascending: false })
      .limit(60);
    if (data.filter === "con_datos") q = q.not("prospect_id", "is", null);
    if (data.filter === "sin_datos") q = q.is("prospect_id", null);
    const { data: sessions, error } = await q;
    if (error) throw new Error(error.message);
    const ids = (sessions ?? []).map((s) => s.id);
    const previews = new Map<string, string>();
    if (ids.length) {
      const { data: msgs } = await context.supabase
        .from("alux_public_messages")
        .select("session_id, content, created_at")
        .in("session_id", ids)
        .eq("role", "user")
        .order("created_at", { ascending: false })
        .limit(600);
      for (const m of msgs ?? []) {
        if (!previews.has(m.session_id)) previews.set(m.session_id, m.content.slice(0, 160));
      }
    }
    return (sessions ?? []).map((s) => ({
      ...s,
      preview: previews.get(s.id) ?? null,
    })) as AluxConversationRow[];
  });

export const getAluxConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ sessionId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context as never);
    const [sessionRes, msgsRes] = await Promise.all([
      context.supabase
        .from("alux_public_sessions")
        .select(
          "id, first_seen_at, last_seen_at, message_count, last_destination_slug, prospect_id, traveler_user_id",
        )
        .eq("id", data.sessionId)
        .maybeSingle(),
      context.supabase
        .from("alux_public_messages")
        .select("id, session_id, role, content, created_at")
        .eq("session_id", data.sessionId)
        .order("created_at", { ascending: true })
        .limit(300),
    ]);
    if (sessionRes.error) throw new Error(sessionRes.error.message);
    if (msgsRes.error) throw new Error(msgsRes.error.message);
    return {
      session: sessionRes.data,
      messages: (msgsRes.data ?? []) as AluxTranscriptMessage[],
    };
  });

export const getProspectStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ days: z.number().int().min(1).max(365).default(30) }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context as never);
    const since = new Date(Date.now() - data.days * 86400000).toISOString();
    const [conversations, withContact, created, all] = await Promise.all([
      context.supabase
        .from("alux_public_sessions")
        .select("id", { count: "exact", head: true })
        .gte("first_seen_at", since)
        .gt("message_count", 0)
        .is("traveler_user_id", null),
      context.supabase
        .from("alux_public_sessions")
        .select("id", { count: "exact", head: true })
        .gte("first_seen_at", since)
        .not("prospect_id", "is", null),
      context.supabase
        .from("concierge_prospects")
        .select("stage, capture_reason, temperature")
        .gte("created_at", since)
        .limit(5000),
      context.supabase.from("concierge_prospects").select("stage").limit(5000),
    ]);
    for (const r of [conversations, withContact, created, all])
      if (r.error) throw new Error(r.error.message);
    const byStage: Record<string, number> = {};
    for (const p of all.data ?? []) byStage[p.stage] = (byStage[p.stage] ?? 0) + 1;
    const byReason: Record<string, number> = {};
    for (const p of created.data ?? []) {
      const k = p.capture_reason ?? "followup";
      byReason[k] = (byReason[k] ?? 0) + 1;
    }
    return {
      days: data.days,
      anonymousConversations: conversations.count ?? 0,
      conversationsWithContact: withContact.count ?? 0,
      prospectsCreated: (created.data ?? []).length,
      byStage,
      byReason,
    };
  });
