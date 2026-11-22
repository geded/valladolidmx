/**
 * Agente de WhatsApp del administrador · respuestas sobre el ecosistema.
 *
 * Reutiliza la misma recuperación que Alux (contenido publicado del CMS y la
 * base de conocimiento) y añade cifras agregadas de Alux. Nunca lee
 * borradores, pagos ni datos personales de viajeros.
 */
import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { DEFAULT_PUBLIC_DOMAIN } from "@/config/site";
import { normalizeText, parseTravelIntent } from "@/lib/alux/converse-contract";
import type { AluxConverseCandidate } from "@/lib/alux/converse-contract";

// Mismo modelo que Alux configura en el CMS (ajustes de Alux).
const FALLBACK_MODEL = "google/gemini-3-flash-preview";
const PUBLIC_ORIGIN = `https://www.${DEFAULT_PUBLIC_DOMAIN}`;
const MAX_CANDIDATES = 18;
const MERIDA_OFFSET_MS = 6 * 60 * 60 * 1000;

const SYSTEM_PROMPT = `Eres Alux, el concierge de Valladolid.mx, respondiendo por WhatsApp al administrador de la plataforma.
Responde en el idioma de la pregunta (español por defecto), breve y claro, con formato de WhatsApp (*negritas*, viñetas con •). Máximo unas 1,200 letras.
Usa SÓLO la información de los bloques de contexto: contenido publicado de Valladolid.mx, base de conocimiento y cifras de Alux. Nunca inventes horarios, precios ni datos.
Si algo no está en el contexto, dilo con honestidad y sugiere qué cargar en el CMS.
Cuando recomiendes lugares, eventos o productos incluye su enlace tal como aparece (máximo 4 enlaces).`;

function absolute(href: string): string {
  if (/^https?:\/\//.test(href)) return href;
  return `${PUBLIC_ORIGIN}${href.startsWith("/") ? "" : "/"}${href}`;
}

function rankCandidates(
  question: string,
  candidates: readonly AluxConverseCandidate[],
): AluxConverseCandidate[] {
  const tokens = normalizeText(question)
    .split(/\s+/)
    .filter((t) => t.length >= 4);
  const scored = candidates.map((c, index) => {
    const hay = normalizeText(
      [c.title, c.subtitle ?? "", c.summary ?? "", ...c.tags, ...c.facts.map((f) => f.text)].join(
        " ",
      ),
    );
    const score = tokens.reduce((sum, t) => sum + (hay.includes(t) ? 1 : 0), 0);
    return { c, score, index };
  });
  return scored
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, MAX_CANDIDATES)
    .map((s) => s.c);
}

function candidateLine(c: AluxConverseCandidate): string {
  const facts = c.facts
    .slice(0, 4)
    .map((f) => f.text)
    .join("; ");
  const night = c.nightFit === "yes" ? " · se vive de noche" : "";
  return `- [${c.family}] ${c.title}${c.destinationLabel ? ` (${c.destinationLabel})` : ""}${night}${
    c.summary ? ` — ${c.summary.slice(0, 220)}` : ""
  }${facts ? ` | ${facts}` : ""} | ${absolute(c.href)}`;
}

type CountClient = {
  from: (table: string) => {
    select: (
      cols: string,
      opts: { count: "exact"; head: true },
    ) => {
      gt: (
        col: string,
        value: number,
      ) => {
        gte: (col: string, value: string) => PromiseLike<{ count: number | null }>;
      };
    };
  };
};

async function aluxActivityBlock(admin: unknown): Promise<string> {
  const now = Date.now();
  const meridaMidnight = new Date(now - MERIDA_OFFSET_MS);
  meridaMidnight.setUTCHours(0, 0, 0, 0);
  const todayIso = new Date(meridaMidnight.getTime() + MERIDA_OFFSET_MS).toISOString();
  const weekIso = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
  const client = admin as CountClient;
  const count = (sinceIso: string) =>
    client
      .from("alux_public_sessions")
      .select("id", { count: "exact", head: true })
      .gt("message_count", 0)
      .gte("first_seen_at", sinceIso);
  const [today, week] = await Promise.all([count(todayIso), count(weekIso)]);
  return `Cifras de Alux (conversaciones iniciadas, sin datos personales): hoy ${today.count ?? 0}; últimos 7 días ${week.count ?? 0}.`;
}

export async function answerOwnerQuestion(question: string): Promise<string> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("missing_lovable_api_key");
  const [{ createClient }, { supabaseAdmin }, retrieval, knowledge, aluxSettings] =
    await Promise.all([
      import("@supabase/supabase-js"),
      import("@/integrations/supabase/client.server"),
      import("@/lib/alux/converse-retrieval.server"),
      import("@/lib/alux/knowledge.functions"),
      import("@/lib/alux/settings.functions"),
    ]);
  const sb = createClient(process.env["SUPABASE_URL"]!, process.env["SUPABASE_PUBLISHABLE_KEY"]!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: destRows } = await sb
    .from("destinations")
    .select("slug, name")
    .eq("status", "published")
    .is("deleted_at", null)
    .limit(40);
  const destinations = ((destRows ?? []) as Array<{ slug: string; name: string }>).filter(
    (d) => d.slug && d.name,
  );
  const knownSlugs = destinations.map((d) => d.slug);
  const intent = parseTravelIntent(question, { knownDestinationSlugs: knownSlugs });
  const mentioned = intent.mentionedDestinationSlugs;
  const primary =
    mentioned[0] ?? (knownSlugs.includes("valladolid") ? "valladolid" : (knownSlugs[0] ?? null));

  const [retrieved, matches, activity, settings] = await Promise.all([
    retrieval.retrieveConverseCandidates(sb, {
      destinationSlug: primary,
      extraDestinationSlugs: mentioned.slice(1, 4),
      searchText: question,
    }),
    knowledge.retrieveAluxKnowledgeServer(supabaseAdmin, question, { matchCount: 4 }),
    aluxActivityBlock(supabaseAdmin).catch(() => ""),
    aluxSettings.resolveAluxSettingsServer(supabaseAdmin).catch(() => null),
  ]);
  const ranked = rankCandidates(question, retrieved.candidates);

  const context = [
    `Destinos publicados: ${destinations.map((d) => d.name).join(", ") || "sin datos"}.`,
    ranked.length
      ? `Contenido publicado relevante (${retrieved.destination?.name ?? "Oriente Maya"}):\n${ranked
          .map(candidateLine)
          .join("\n")}`
      : "",
    knowledge.knowledgeToPromptBlock(matches, { locale: "es" }),
    activity,
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const provider = createLovableAiGatewayProvider(apiKey);
    const { text } = await generateText({
      model: provider(settings?.default_model ?? FALLBACK_MODEL),
      system: `${SYSTEM_PROMPT}\n\n${context}`,
      prompt: question.slice(0, 1500),
      temperature: 0.3,
      abortSignal: AbortSignal.timeout(20_000),
    });
    if (text.trim()) return text.trim();
  } catch (error) {
    console.error("whatsapp agent answer failed", {
      error: error instanceof Error ? error.message.slice(0, 200) : "unknown",
    });
  }
  if (!ranked.length) {
    return "No encontré información publicada sobre eso en Valladolid.mx. Intenta con otro destino o tema.";
  }
  return [
    "Esto es lo que encontré publicado en Valladolid.mx:",
    ...ranked.slice(0, 5).map((c) => `• *${c.title}* — ${absolute(c.href)}`),
  ].join("\n");
}
