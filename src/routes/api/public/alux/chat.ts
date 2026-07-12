/**
 * Ola A3 · Alux Público (prospectos anónimos)
 *
 * Endpoint público que permite a visitantes sin cuenta conversar con
 * Alux con rate-limit por hash de IP. Consume la Base de Conocimiento
 * (M4) pero NO tiene memoria persistente (M1/M2/M3): la conversación
 * vive en el cliente y se envía como historial en cada turno.
 */
import { createFileRoute } from "@tanstack/react-router";
import { createHash } from "crypto";
import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import {
  retrieveAluxKnowledgeServer,
  knowledgeToPromptBlock,
} from "@/lib/alux/knowledge.functions";
import { resolveAluxSettingsServer } from "@/lib/alux/settings.functions";

const HOUR_LIMIT = 10;
const DAY_LIMIT = 40;
const MAX_MESSAGE_LEN = 800;
const MAX_HISTORY_TURNS = 8;
const NEARBY_RADIUS_KM = 25;
const NEARBY_LIMIT = 6;

type Msg = { role: "user" | "assistant"; content: string };
type Visitor = { lat: number; lng: number };

function haversineKm(a: Visitor, b: { lat: number; lng: number }): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function parseVisitor(input: unknown): Visitor | null {
  if (!input || typeof input !== "object") return null;
  const v = input as { lat?: unknown; lng?: unknown };
  const lat = typeof v.lat === "number" ? v.lat : NaN;
  const lng = typeof v.lng === "number" ? v.lng : NaN;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

async function fetchNearbyBusinesses(
  supabaseAdmin: typeof import("@/integrations/supabase/client.server")["supabaseAdmin"],
  visitor: Visitor,
): Promise<Array<{ name: string; category: string | null; km: number; slug: string }>> {
  const { data, error } = await supabaseAdmin
    .from("businesses")
    .select(
      "slug, display_name, primary_category:business_categories!businesses_primary_category_id_fkey ( slug, display_name ), business_locations!business_locations_business_id_fkey ( latitude, longitude, is_primary )",
    )
    .eq("status", "published")
    .limit(200);
  if (error || !data) return [];
  const scored: Array<{ name: string; category: string | null; km: number; slug: string }> = [];
  for (const r of data as Array<{
    slug: string;
    display_name: string;
    primary_category?: { slug: string; display_name: string | null } | null;
    business_locations?: Array<{
      latitude: number | null;
      longitude: number | null;
      is_primary: boolean | null;
    }>;
  }>) {
    const locs = r.business_locations ?? [];
    const primary = locs.find((l) => l.is_primary) ?? locs[0];
    if (!primary || primary.latitude == null || primary.longitude == null) continue;
    const km = haversineKm(visitor, {
      lat: Number(primary.latitude),
      lng: Number(primary.longitude),
    });
    if (km > NEARBY_RADIUS_KM) continue;
    scored.push({
      slug: r.slug,
      name: r.display_name,
      category: r.primary_category?.display_name ?? r.primary_category?.slug ?? null,
      km,
    });
  }
  scored.sort((a, b) => a.km - b.km);
  return scored.slice(0, NEARBY_LIMIT);
}

function nearbyToPromptBlock(
  visitor: Visitor,
  items: Array<{ name: string; category: string | null; km: number }>,
): string {
  if (items.length === 0) {
    return `[CONTEXTO ESPACIAL] El visitante compartió su ubicación (${visitor.lat.toFixed(3)}, ${visitor.lng.toFixed(3)}) pero no hay negocios publicados dentro de ${NEARBY_RADIUS_KM} km. Menciónalo con transparencia y recomienda destinos del Oriente Maya por relevancia territorial.`;
  }
  const lines = items.map(
    (i) => `- ${i.name}${i.category ? ` (${i.category})` : ""} · a ${i.km.toFixed(1)} km`,
  );
  return `[CONTEXTO ESPACIAL] El visitante compartió su ubicación aproximada. Negocios publicados más cercanos (radio ${NEARBY_RADIUS_KM} km, ordenados por distancia real):\n${lines.join("\n")}\n\nCuando recomiendes lugares cercanos: (1) usa SÓLO estos negocios, (2) menciona la distancia con naturalidad ("a X km"), (3) explica que es cercanía real desde su ubicación compartida, (4) si el visitante NO preguntó por cercanía, no fuerces la mención.`;
}

function hashIp(ip: string): string {
  const salt = process.env.ALUX_PUBLIC_IP_SALT ?? process.env.SUPABASE_URL ?? "vmx";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

function getClientIp(request: Request): string {
  const h = request.headers;
  return (
    h.get("cf-connecting-ip") ??
    h.get("x-real-ip") ??
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "0.0.0.0"
  );
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const PUBLIC_PERSONA_EXTRA =
  "Estás hablando con un VISITANTE anónimo que aún no ha creado una cuenta en Valladolid.mx. " +
  "Tu misión es inspirarlo a viajar al Oriente Maya (Valladolid, Izamal, Espita, cenotes, Chichén Itzá, gastronomía) y ayudarlo con dudas turísticas iniciales (clima, cuándo ir, cómo llegar, cuánto tiempo quedarse, seguridad, cultura, Pueblos Mágicos). " +
  "NO tienes acceso a su viaje ni a cupones personales. NO reserves, no cotices, no envíes al concierge, no inventes negocios ni precios. " +
  "Cuando sea útil, invita al visitante a crear su cuenta gratuita para armar su viaje con Alux, descubrir promociones (`/promociones`) y hablar con el concierge humano. " +
  "Responde en español, breve (máx. 6 líneas por turno), cálido y editorial. Usa exclusivamente la Base de Conocimiento del territorio cuando cites datos concretos.";

export const Route = createFileRoute("/api/public/alux/chat")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            "access-control-allow-origin": "*",
            "access-control-allow-methods": "POST, OPTIONS",
            "access-control-allow-headers": "content-type",
          },
        }),
      POST: async ({ request }) => {
        let body: {
          sessionKey?: string;
          message?: string;
          history?: Msg[];
          visitor?: Visitor;
        };
        try {
          body = await request.json();
        } catch {
          return json({ error: "invalid_json" }, 400);
        }

        const sessionKey = String(body.sessionKey ?? "").slice(0, 128);
        const message = String(body.message ?? "").trim();
        if (!sessionKey || sessionKey.length < 8) return json({ error: "missing_session" }, 400);
        if (!message) return json({ error: "empty_message" }, 400);
        if (message.length > MAX_MESSAGE_LEN) return json({ error: "message_too_long" }, 400);
        const visitor = parseVisitor(body.visitor);

        const history = Array.isArray(body.history)
          ? body.history
              .filter(
                (m): m is Msg =>
                  !!m &&
                  (m.role === "user" || m.role === "assistant") &&
                  typeof m.content === "string",
              )
              .slice(-MAX_HISTORY_TURNS * 2)
              .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }))
          : [];

        const ip = getClientIp(request);
        const ipHash = hashIp(ip);
        const userAgent = request.headers.get("user-agent")?.slice(0, 300) ?? null;

        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) return json({ error: "missing_api_key" }, 500);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // 1) Rate-limit atómico por IP.
        const { data: rate, error: rateErr } = await supabaseAdmin.rpc(
          "alux_public_check_rate",
          {
            _ip_hash: ipHash,
            _hour_limit: HOUR_LIMIT,
            _day_limit: DAY_LIMIT,
          },
        );
        if (rateErr) return json({ error: "rate_check_failed" }, 500);
        const rateRow = Array.isArray(rate) ? rate[0] : rate;
        if (rateRow && rateRow.allowed === false) {
          return json(
            {
              error: "rate_limited",
              hour_count: rateRow.hour_count,
              day_count: rateRow.day_count,
              hour_limit: HOUR_LIMIT,
              day_limit: DAY_LIMIT,
              message:
                "Has alcanzado el límite de mensajes por hoy como visitante. Crea tu cuenta gratuita para seguir conversando con Alux sin límites.",
            },
            429,
          );
        }

        // 2) Upsert de sesión.
        const { data: sessionRow, error: sessErr } = await supabaseAdmin
          .from("alux_public_sessions")
          .upsert(
            {
              session_key: sessionKey,
              ip_hash: ipHash,
              user_agent: userAgent,
              last_seen_at: new Date().toISOString(),
            },
            { onConflict: "session_key" },
          )
          .select("id, message_count")
          .single();
        if (sessErr || !sessionRow) return json({ error: "session_upsert_failed" }, 500);
        const sessionId = sessionRow.id as string;

        // 3) Log del mensaje del usuario.
        await supabaseAdmin.from("alux_public_messages").insert({
          session_id: sessionId,
          ip_hash: ipHash,
          role: "user",
          content: message,
        });

        // 4) Retrieval M4 (KB) + settings.
        const settings = await resolveAluxSettingsServer(supabaseAdmin).catch(() => null);
        const model = settings?.default_model ?? "google/gemini-3-flash-preview";
        const query = [message, ...history.slice(-2).map((m) => m.content)]
          .join(" ")
          .slice(0, 500);
        const matches =
          !settings || settings.flags.m4_knowledge
            ? await retrieveAluxKnowledgeServer(supabaseAdmin, query, { matchCount: 4 })
            : [];
        const knowledgeBlock = knowledgeToPromptBlock(matches);
        const knowledgeIds = matches.map((m) => m.id);

        // 4b) Contexto espacial (opt-in).
        let nearbyBlock = "";
        let nearbyCount = 0;
        if (visitor) {
          const nearby = await fetchNearbyBusinesses(supabaseAdmin, visitor).catch(
            () => [] as Awaited<ReturnType<typeof fetchNearbyBusinesses>>,
          );
          nearbyBlock = nearbyToPromptBlock(visitor, nearby);
          nearbyCount = nearby.length;
        }

        // 5) Genera respuesta.
        const provider = createLovableAiGatewayProvider(apiKey);
        const persona =
          settings?.persona ??
          "Eres Alux, la inteligencia turística de Valladolid y el Oriente Maya.";
        const guardrails =
          settings?.guardrails ??
          "Nunca inventes datos. Prioriza al viajero. Cita el contexto.";
        const system = [
          persona,
          PUBLIC_PERSONA_EXTRA,
          knowledgeBlock,
          nearbyBlock,
          `---\n${guardrails}`,
        ]
          .filter(Boolean)
          .join("\n\n");

        const t0 = Date.now();
        let text = "";
        let tokensIn: number | null = null;
        let tokensOut: number | null = null;
        try {
          const res = await generateText({
            model: provider(model),
            system,
            messages: [
              ...history.map((m) => ({ role: m.role, content: m.content })),
              { role: "user" as const, content: message },
            ],
          });
          text = res.text;
          tokensIn = res.usage?.inputTokens ?? null;
          tokensOut = res.usage?.outputTokens ?? null;
        } catch (err) {
          return json(
            {
              error: "model_error",
              message: err instanceof Error ? err.message : "unknown",
            },
            502,
          );
        }
        const latency = Date.now() - t0;

        // 6) Log de la respuesta + incremento del contador.
        await supabaseAdmin.from("alux_public_messages").insert({
          session_id: sessionId,
          ip_hash: ipHash,
          role: "assistant",
          content: text,
          knowledge_ids: knowledgeIds,
          latency_ms: latency,
          model,
          tokens_in: tokensIn,
          tokens_out: tokensOut,
        });
        await supabaseAdmin
          .from("alux_public_sessions")
          .update({
            message_count: (sessionRow.message_count ?? 0) + 1,
            last_seen_at: new Date().toISOString(),
          })
          .eq("id", sessionId);

        return json({
          text,
          model,
          latency_ms: latency,
          knowledge_used: matches.length,
          nearby_used: nearbyCount,
          spatial_context: visitor ? "granted" : "none",
          rate: {
            hour_count: (rateRow?.hour_count ?? 0) + 1,
            day_count: (rateRow?.day_count ?? 0) + 1,
            hour_limit: HOUR_LIMIT,
            day_limit: DAY_LIMIT,
          },
        });
      },
    },
  },
});