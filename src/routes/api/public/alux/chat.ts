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
// Ola A8 · M3 multiturno público: la memoria se refresca por SEÑALES DE VIAJE
// (identidad, viaje, territorio, acciones), NO por conteo de turnos. Alux es
// concierge, no chatbot: cada refresco responde a un cambio real del contexto.
const GEO_MOVE_KM_THRESHOLD = 2;
const SUMMARY_MAX_CHARS = 900;
const EVENTS_LOOKAHEAD_DAYS = 7;
const EVENTS_LIMIT = 5;

type Msg = { role: "user" | "assistant"; content: string };
type Visitor = { lat: number; lng: number };
type PathContext = { destination?: string | null; category?: string | null };

// ---------------------------------------------------------------------------
// Ola A9 · Contexto temporal / ambiental (concierge, no chatbot).
// ---------------------------------------------------------------------------
function getTemporalContext(): {
  block: string;
  isoLocal: string;
  partOfDay: "madrugada" | "mañana" | "mediodía" | "tarde" | "noche";
  season: "seca" | "lluvias";
} {
  const tz = "America/Merida";
  const now = new Date();
  const fmt = new Intl.DateTimeFormat("es-MX", {
    timeZone: tz,
    weekday: "long",
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const hour = Number(get("hour"));
  const monthIdx = new Date(
    now.toLocaleString("en-US", { timeZone: tz }),
  ).getMonth(); // 0..11
  const partOfDay: "madrugada" | "mañana" | "mediodía" | "tarde" | "noche" =
    hour < 6 ? "madrugada"
    : hour < 12 ? "mañana"
    : hour < 14 ? "mediodía"
    : hour < 19 ? "tarde"
    : "noche";
  // Yucatán: temporada de lluvias mayo–octubre; seca noviembre–abril.
  const season: "seca" | "lluvias" = monthIdx >= 4 && monthIdx <= 9 ? "lluvias" : "seca";
  const isoLocal = `${get("weekday")} ${get("day")} de ${get("month")}, ${get("hour")}:${get("minute")}`;
  const block =
    `[CONTEXTO TEMPORAL] Ahora en el Oriente Maya (${tz}): ${isoLocal}. ` +
    `Es ${partOfDay}. Temporada ${season} en Yucatán. ` +
    `Ajusta tus sugerencias al momento del día (madrugada: casi todo cerrado; mañana: cenotes y ruinas frescos; mediodía: calor intenso, refugio y comida; tarde: paseo por el centro; noche: gastronomía y vida cultural) y a la temporada (lluvias: posibles chubascos vespertinos, prever plan B bajo techo; seca: días soleados y noches templadas). Nunca contradigas este momento.`;
  return { block, isoLocal, partOfDay, season };
}

async function fetchActiveEvents(
  supabaseAdmin: typeof import("@/integrations/supabase/client.server")["supabaseAdmin"],
  destinationSlug: string | null,
): Promise<Array<{ title: string; venue: string | null; startsAt: string; isFree: boolean | null }>> {
  if (!destinationSlug) return [];
  const { data: dest } = await supabaseAdmin
    .from("destinations")
    .select("id")
    .eq("slug", destinationSlug)
    .maybeSingle();
  if (!dest?.id) return [];
  const nowIso = new Date().toISOString();
  const untilIso = new Date(
    Date.now() + EVENTS_LOOKAHEAD_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
  const { data, error } = await supabaseAdmin
    .from("events")
    .select("title, venue_name, starts_at, ends_at, is_free")
    .eq("destination_id", dest.id)
    .eq("status", "published")
    .is("deleted_at", null)
    .lte("starts_at", untilIso)
    .or(`ends_at.gte.${nowIso},ends_at.is.null`)
    .order("starts_at", { ascending: true })
    .limit(EVENTS_LIMIT);
  if (error || !data) return [];
  return data.map((e) => ({
    title: e.title,
    venue: e.venue_name ?? null,
    startsAt: e.starts_at as string,
    isFree: e.is_free,
  }));
}

function eventsToPromptBlock(
  events: Array<{ title: string; venue: string | null; startsAt: string; isFree: boolean | null }>,
): string {
  if (events.length === 0) return "";
  const lines = events.map((e) => {
    const when = new Date(e.startsAt).toLocaleString("es-MX", {
      timeZone: "America/Merida",
      weekday: "short",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const price = e.isFree === true ? " · gratis" : "";
    const venue = e.venue ? ` @ ${e.venue}` : "";
    return `- ${e.title}${venue} · ${when}${price}`;
  });
  return `[EVENTOS ACTIVOS] Eventos publicados en los próximos ${EVENTS_LOOKAHEAD_DAYS} días en este destino:\n${lines.join("\n")}\n\nCuando el viajero pregunte "qué hay esta semana / hoy / este fin", menciona SOLO estos eventos con la fecha real.`;
}

// ---------------------------------------------------------------------------
// Detección de señales de viaje (concierge, no chatbot)
// Categorías cubiertas aquí: 1 Identidad, 2 Viaje, 3 Territorial, 5 Acción.
// Las señales 6 (temporal/clima/eventos) llegan en Ola A9.
// ---------------------------------------------------------------------------
type TravelSignal =
  | "origin"
  | "companions"
  | "budget"
  | "restrictions"
  | "dates"
  | "duration"
  | "lodging_anchor"
  | "interests"
  | "pace"
  | "action_intent";

const SIGNAL_PATTERNS: Array<{ signal: TravelSignal; re: RegExp }> = [
  { signal: "origin", re: /\b(vengo|venimos|soy de|somos de|desde|llego de|llegamos de)\b/i },
  {
    signal: "companions",
    re: /\b(solo|sola|pareja|mi esposa|mi esposo|con mi novia|con mi novio|familia|con mis hijos|niños|niñas|con amigos|grupo|adultos mayores|mis papás|mis padres)\b/i,
  },
  {
    signal: "budget",
    re: /\b(barato|económico|económica|low cost|presupuesto|gastar|invertir|sin importar precio|lujo|mid range|mochilero|backpacker|\$\d|mxn|usd|pesos|dólares)\b/i,
  },
  {
    signal: "restrictions",
    re: /\b(vegano|vegana|vegetariano|vegetariana|sin gluten|celíaco|celíaca|alergi|kosher|halal|silla de ruedas|movilidad|embarazad|diabét)\b/i,
  },
  {
    signal: "dates",
    re: /\b(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre|el próximo|la próxima semana|este fin|semana santa|navidad|año nuevo|puente|el \d{1,2}\s*(de|\/))\b/i,
  },
  {
    signal: "duration",
    re: /\b(un día|dos días|tres días|\d+\s*(días|dias|noches|horas|semanas|weeks|days))\b/i,
  },
  {
    signal: "lodging_anchor",
    re: /\b(hotel|hostal|airbnb|casa|hospedaje|donde me hospedo|mi alojamiento|nos quedamos en|estoy en el|estamos en el)\b/i,
  },
  {
    signal: "interests",
    re: /\b(cenote|arqueolog|ruinas|chichén|chichen|coba|ek balam|gastronom|comida|foodie|artesan|maya|cultura|fotograf|nocturna|bar|snorkel|buceo|bici|maratón|yoga|spa)\b/i,
  },
  {
    signal: "pace",
    re: /\b(relax|tranquilo|aventura|intenso|improvisar|planear|itinerario|con calma|sin prisa)\b/i,
  },
  {
    signal: "action_intent",
    re: /\b(cómo llego|como llego|cómo llegar|reservar|reserva|contactar|guardar|apartar|comprar|precio|cotizar)\b/i,
  },
];

function detectSignals(text: string): TravelSignal[] {
  const found = new Set<TravelSignal>();
  for (const { signal, re } of SIGNAL_PATTERNS) {
    if (re.test(text)) found.add(signal);
  }
  return Array.from(found);
}

function parsePathContext(input: unknown): PathContext | null {
  if (!input || typeof input !== "object") return null;
  const p = input as { destination?: unknown; category?: unknown };
  const dest = typeof p.destination === "string" ? p.destination.slice(0, 80) : null;
  const cat = typeof p.category === "string" ? p.category.slice(0, 80) : null;
  if (!dest && !cat) return null;
  return { destination: dest, category: cat };
}

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

function memoryToPromptBlock(summary: string | null | undefined): string {
  if (!summary || summary.trim().length === 0) return "";
  return `[MEMORIA M3 · Conversación previa con este visitante]\n${summary.trim()}\n\nUsa esta memoria para NO re-preguntar datos ya compartidos (país, fechas, presupuesto, intereses, con quién viaja). Si contradice el turno actual, prioriza el turno actual.`;
}

async function refreshSessionSummary(
  provider: ReturnType<typeof createLovableAiGatewayProvider>,
  model: string,
  previousSummary: string | null,
  history: Msg[],
  latestUser: string,
  latestAssistant: string,
): Promise<string | null> {
  try {
    const convo = [
      ...history.map((m) => `${m.role === "user" ? "Visitante" : "Alux"}: ${m.content}`),
      `Visitante: ${latestUser}`,
      `Alux: ${latestAssistant}`,
    ]
      .join("\n")
      .slice(-4000);
    const sys =
      "Eres el sistema de memoria de Alux (concierge turístico del Oriente Maya). " +
      "Tu tarea es mantener un RESUMEN INCREMENTAL de la conversación con un visitante anónimo. " +
      `Devuelve un texto plano de máximo ${SUMMARY_MAX_CHARS} caracteres, en español, en tercera persona, ` +
      "que capture SOLO hechos útiles para futuras respuestas: origen, fechas/estación, duración del viaje, " +
      "con quién viaja, presupuesto declarado, intereses, restricciones (dieta, movilidad, idioma), " +
      "destinos/experiencias ya sugeridos y decisiones tomadas. " +
      "Nada de saludos, disculpas ni conjeturas. Si no hay hechos nuevos, devuelve el resumen previo casi igual.";
    const prompt = [
      previousSummary ? `Resumen previo:\n${previousSummary}` : "Resumen previo: (vacío)",
      "",
      "Conversación reciente:",
      convo,
      "",
      "Devuelve SOLO el nuevo resumen incremental.",
    ].join("\n");
    const res = await generateText({
      model: provider(model),
      system: sys,
      prompt,
    });
    const text = (res.text ?? "").trim().slice(0, SUMMARY_MAX_CHARS);
    return text.length > 0 ? text : previousSummary;
  } catch {
    return previousSummary;
  }
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
          pathContext?: PathContext;
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
        const pathContext = parsePathContext(body.pathContext);

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
          .select(
            "id, message_count, summary, summary_message_count, last_destination_slug, last_category_slug, last_spatial_state, last_lat, last_lng, last_signals",
          )
          .single();
        if (sessErr || !sessionRow) return json({ error: "session_upsert_failed" }, 500);
        const sessionId = sessionRow.id as string;
        const previousSummary =
          (sessionRow as { summary?: string | null }).summary ?? null;
        const prev = sessionRow as {
          last_destination_slug?: string | null;
          last_category_slug?: string | null;
          last_spatial_state?: string | null;
          last_lat?: number | null;
          last_lng?: number | null;
          last_signals?: unknown;
        };
        const prevSignals: TravelSignal[] = Array.isArray(prev.last_signals)
          ? (prev.last_signals as TravelSignal[])
          : [];

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

        // 4c) Memoria M3 (resumen incremental por sesión).
        const memoryBlock = memoryToPromptBlock(previousSummary);

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

        // 4d) Contexto temporal + eventos activos (Ola A9).
        const temporal = getTemporalContext();
        const activeDestination =
          pathContext?.destination ??
          (sessionRow as { last_destination_slug?: string | null }).last_destination_slug ??
          null;
        const activeEvents = await fetchActiveEvents(
          supabaseAdmin,
          activeDestination,
        ).catch(() => []);
        const eventsBlock = eventsToPromptBlock(activeEvents);

        // 4e) Clima real (Ola A10 · Open-Meteo, sin API key).
        // Fuente: GPS del visitante si compartió ubicación; si no,
        // coordenadas del destino activo como fallback territorial.
        let weatherBlock = "";
        let weatherSource: "gps" | "destino" | null = null;
        let weatherLat: number | null = null;
        let weatherLon: number | null = null;
        let destinationLabel: string | null = null;
        if (visitor) {
          weatherSource = "gps";
          weatherLat = visitor.lat;
          weatherLon = visitor.lng;
        } else if (activeDestination) {
          const { data: destGeo } = await supabaseAdmin
            .from("destinations")
            .select("name, latitude, longitude")
            .eq("slug", activeDestination)
            .maybeSingle();
          if (
            destGeo &&
            typeof destGeo.latitude === "number" &&
            typeof destGeo.longitude === "number"
          ) {
            weatherSource = "destino";
            weatherLat = destGeo.latitude;
            weatherLon = destGeo.longitude;
            destinationLabel = destGeo.name ?? activeDestination;
          }
        }
        if (weatherSource && weatherLat !== null && weatherLon !== null) {
          const { fetchWeatherCached, weatherToPromptBlock } = await import(
            "@/lib/alux/weather.server"
          );
          const snapshot = await fetchWeatherCached(weatherLat, weatherLon).catch(
            () => null,
          );
          weatherBlock = weatherToPromptBlock(
            snapshot,
            weatherSource,
            destinationLabel,
          );
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
          memoryBlock,
          temporal.block,
          knowledgeBlock,
          nearbyBlock,
          eventsBlock,
          weatherBlock,
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
        const newMessageCount = (sessionRow.message_count ?? 0) + 1;

        // 6b) M3 · Refresco por SEÑALES DE VIAJE (concierge, no chatbot).
        const detected = detectSignals(message);
        const newSignals = detected.filter((s) => !prevSignals.includes(s));
        const mergedSignals = Array.from(new Set([...prevSignals, ...detected]));

        const nextSpatialState: string = visitor ? "granted" : prev.last_spatial_state ?? "none";
        const spatialTransitioned =
          !!visitor && (prev.last_spatial_state ?? "none") !== "granted";
        const geoMovedKm =
          visitor && prev.last_lat != null && prev.last_lng != null
            ? haversineKm(visitor, { lat: Number(prev.last_lat), lng: Number(prev.last_lng) })
            : 0;
        const geoMoved = geoMovedKm >= GEO_MOVE_KM_THRESHOLD;

        const nextDestination = pathContext?.destination ?? prev.last_destination_slug ?? null;
        const nextCategory = pathContext?.category ?? prev.last_category_slug ?? null;
        const territoryChanged =
          (!!pathContext?.destination &&
            pathContext.destination !== (prev.last_destination_slug ?? null)) ||
          (!!pathContext?.category &&
            pathContext.category !== (prev.last_category_slug ?? null));

        const refreshReasons: string[] = [];
        if (!previousSummary && detected.length > 0) refreshReasons.push("first_signal");
        if (newSignals.length > 0) refreshReasons.push("new_signal");
        if (spatialTransitioned) refreshReasons.push("spatial_granted");
        if (geoMoved) refreshReasons.push("geo_moved");
        if (territoryChanged) refreshReasons.push("territory_changed");

        let nextSummary: string | null = previousSummary;
        let nextSummaryCount = (sessionRow as { summary_message_count?: number }).summary_message_count ?? 0;
        let memoryRefreshed = false;
        if (refreshReasons.length > 0) {
          const refreshed = await refreshSessionSummary(
            provider,
            model,
            previousSummary,
            history,
            message,
            text,
          );
          if (refreshed && refreshed !== previousSummary) {
            nextSummary = refreshed;
            nextSummaryCount = newMessageCount;
            memoryRefreshed = true;
          }
        }

        await supabaseAdmin
          .from("alux_public_sessions")
          .update({
            message_count: newMessageCount,
            last_seen_at: new Date().toISOString(),
            last_signals: mergedSignals,
            last_spatial_state: nextSpatialState,
            ...(visitor ? { last_lat: visitor.lat, last_lng: visitor.lng } : {}),
            ...(nextDestination ? { last_destination_slug: nextDestination } : {}),
            ...(nextCategory ? { last_category_slug: nextCategory } : {}),
            ...(memoryRefreshed
              ? {
                  summary: nextSummary,
                  summary_message_count: nextSummaryCount,
                  summary_updated_at: new Date().toISOString(),
                }
              : {}),
          })
          .eq("id", sessionId);

        return json({
          text,
          model,
          latency_ms: latency,
          knowledge_used: matches.length,
          nearby_used: nearbyCount,
          spatial_context: visitor ? "granted" : "none",
          temporal: {
            local: temporal.isoLocal,
            part_of_day: temporal.partOfDay,
            season: temporal.season,
            events_used: activeEvents.length,
          },
          memory: {
            has_summary: !!nextSummary,
            refreshed: memoryRefreshed,
            reasons: refreshReasons,
            signals: mergedSignals,
          },
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