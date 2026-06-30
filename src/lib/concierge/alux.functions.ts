/**
 * 14.60.6 — Alux Asistente del Concierge (read-only).
 * Server functions que envuelven RPCs de contexto/log y llamadas al
 * Lovable AI Gateway. Toda mutación sobre el dominio Concierge sigue
 * ocurriendo a través de las RPCs ya aprobadas (14.60.3 / 14.60.4 /
 * 14.60.5), invocadas por el concierge humano desde la UI.
 */
import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

const DEFAULT_MODEL = "google/gemini-3-flash-preview";

const CaseInput = z.object({ caseId: z.string().uuid() });
const ProposalDraftInput = z.object({
  caseId: z.string().uuid(),
  productIds: z.array(z.string().uuid()).optional().default([]),
});
const LogInput = z.object({
  caseId: z.string().uuid(),
  capability: z.enum([
    "summary",
    "products",
    "proposal_draft",
    "comms_digest",
    "risk_detection",
    "opportunity_detection",
  ]),
  meta: z.record(z.string(), z.unknown()).optional().default({}),
});

export type AluxCapability = z.infer<typeof LogInput>["capability"];

export interface AluxSuggestion {
  capability: AluxCapability;
  model: string;
  text: string;
  latency_ms: number;
  disclaimer: string;
}

const DISCLAIMER = "Sugerencia generada por Alux. Revisa antes de enviar.";

function requireApiKey(): string {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  return key;
}

// Supabase typed-client wrapper helpers — cast through `unknown` because
// these RPCs are generated names; the database guarantees the shape.
type RpcClient = {
  rpc: (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
};

async function fetchContext(supabase: unknown, caseId: string): Promise<unknown> {
  const c = supabase as RpcClient;
  const { data, error } = await c.rpc("concierge_alux_context_for_case", {
    _case_id: caseId,
  });
  if (error) throw new Error(error.message);
  return data;
}

async function logSuggestion(
  supabase: unknown,
  caseId: string,
  capability: AluxCapability,
  meta: Record<string, unknown>,
) {
  const c = supabase as RpcClient;
  const { error } = await c.rpc("concierge_alux_log_suggestion", {
    _case_id: caseId,
    _capability: capability,
    _meta: meta,
  });
  if (error) throw new Error(error.message);
}

async function runAlux(
  capability: AluxCapability,
  systemPrompt: string,
  context: unknown,
  userPrompt: string,
  supabase: unknown,
  caseId: string,
): Promise<AluxSuggestion> {
  const provider = createLovableAiGatewayProvider(requireApiKey());
  const t0 = Date.now();
  const { text, usage } = await generateText({
    model: provider(DEFAULT_MODEL),
    system: systemPrompt,
    prompt:
      userPrompt +
      "\n\nContexto del expediente (JSON):\n```json\n" +
      JSON.stringify(context).slice(0, 24_000) +
      "\n```",
  });
  const latency = Date.now() - t0;

  await logSuggestion(supabase, caseId, capability, {
    model: DEFAULT_MODEL,
    latency_ms: latency,
    tokens_in: usage?.inputTokens ?? null,
    tokens_out: usage?.outputTokens ?? null,
  });

  return {
    capability,
    model: DEFAULT_MODEL,
    text,
    latency_ms: latency,
    disclaimer: DISCLAIMER,
  };
}

// ---------- Server functions expuestas ----------

export const getAluxContextForCase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => CaseInput.parse(d))
  .handler(async ({ data, context }) => {
    return fetchContext(context.supabase, data.caseId);
  });

export const logAluxSuggestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => LogInput.parse(d))
  .handler(async ({ data, context }) => {
    await logSuggestion(context.supabase, data.caseId, data.capability, data.meta);
    return { ok: true };
  });

export const generateAluxSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => CaseInput.parse(d))
  .handler(async ({ data, context }) => {
    const ctx = await fetchContext(context.supabase, data.caseId);
    return runAlux(
      "summary",
      "Eres Alux, copiloto operativo del concierge de Valladolid.mx. Respondes en español, en tono profesional y breve. Nunca inventas datos. Solo usas la información del contexto entregado.",
      ctx,
      "Genera un resumen estructurado del expediente: estado, prioridad, SLA, últimos hitos, contrapartes activas y próximos pasos sugeridos. Máximo 180 palabras.",
      context.supabase,
      data.caseId,
    );
  });

export const generateAluxProducts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => CaseInput.parse(d))
  .handler(async ({ data, context }) => {
    const ctx = await fetchContext(context.supabase, data.caseId);
    return runAlux(
      "products",
      "Eres Alux. Solo recomiendas productos/empresas que aparezcan en el contexto del expediente o en sus solicitudes. Si no hay candidatos claros, dilo.",
      ctx,
      "Sugiere productos candidatos compatibles con las solicitudes del expediente. Devuelve hasta 5 ítems con: nombre/empresa, razón corta (1 línea) y nivel de confianza (alto/medio/bajo).",
      context.supabase,
      data.caseId,
    );
  });

export const generateAluxProposalDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => ProposalDraftInput.parse(d))
  .handler(async ({ data, context }) => {
    const ctx = await fetchContext(context.supabase, data.caseId);
    return runAlux(
      "proposal_draft",
      "Eres Alux. Redactas borradores claros y honestos para el viajero. Nunca confirmas precios ni disponibilidad: usas solo los montos presentes en el contexto.",
      ctx,
      "Redacta un borrador de propuesta integral del viaje a partir de las cotizaciones recibidas y, si corresponde, los productos seleccionados (" +
        JSON.stringify(data.productIds) +
        "). Incluye: introducción al viajero, ítems con monto, vigencia sugerida y condiciones generales. El concierge revisará antes de enviar.",
      context.supabase,
      data.caseId,
    );
  });

export const generateAluxCommsDigest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => CaseInput.parse(d))
  .handler(async ({ data, context }) => {
    const ctx = await fetchContext(context.supabase, data.caseId);
    return runAlux(
      "comms_digest",
      "Eres Alux. Sintetizas la conversación operativa del expediente sin alterar hechos ni inferir intenciones no presentes en las notas.",
      ctx,
      "Genera un resumen cronológico de las comunicaciones y eventos relevantes del expediente, destacando pendientes y compromisos.",
      context.supabase,
      data.caseId,
    );
  });

// ---------- Copiloto operativo (ampliación 14.60.6) ----------

export const generateAluxRiskDetection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => CaseInput.parse(d))
  .handler(async ({ data, context }) => {
    const ctx = await fetchContext(context.supabase, data.caseId);
    return runAlux(
      "risk_detection",
      "Eres Alux operando en modo estrictamente consultivo. No ejecutas acciones. Solo identificas riesgos operativos detectables a partir del contexto entregado.",
      ctx,
      "Detecta riesgos operativos del expediente y clasifícalos por severidad (alta/media/baja). Considera: SLA próximo a vencer, cotizaciones por expirar, pagos pendientes, empresas sin respuesta, conflictos de agenda y prioridad sin sustento. Para cada riesgo: nombre, evidencia tomada del contexto y acción sugerida que un humano podría ejecutar.",
      context.supabase,
      data.caseId,
    );
  });

export const generateAluxOpportunityDetection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => CaseInput.parse(d))
  .handler(async ({ data, context }) => {
    const ctx = await fetchContext(context.supabase, data.caseId);
    return runAlux(
      "opportunity_detection",
      "Eres Alux en modo consultivo. Solo sugieres, nunca ejecutas. Tus oportunidades deben derivar del contexto y respetar el interés del viajero antes que la venta.",
      ctx,
      "Identifica oportunidades comerciales relevantes para este expediente: promociones compatibles con las empresas o productos vinculados, productos complementarios, mejoras de itinerario y oportunidades de venta cruzada. Devuelve hasta 5 ítems con: oportunidad, justificación basada en el contexto e impacto estimado (alto/medio/bajo). Ninguna acción se ejecuta automáticamente.",
      context.supabase,
      data.caseId,
    );
  });