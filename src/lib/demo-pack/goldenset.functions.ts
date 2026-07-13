/**
 * Demo Pack v1 · Sub-ola 4 · Golden Set runner.
 *
 * Ejecuta las preguntas modelo del recorrido demo contra el AI Gateway
 * usando la misma KB que consume Alux, y evalúa la respuesta contra
 * entidades esperadas y términos prohibidos. Admin-only.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText } from "ai";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import {
  retrieveAluxKnowledgeServer,
  knowledgeToPromptBlock,
} from "@/lib/alux/knowledge.functions";

export interface DemoEvaluation {
  id: string;
  suite: string;
  question: string;
  locale: string;
  expected_entities: string[];
  forbidden_terms: string[];
  last_answer: string | null;
  last_score: number | null;
  last_hallucination_risk: number | null;
  last_latency_ms: number | null;
  last_matched_entities: string[];
  last_missing_entities: string[];
  last_run_at: string | null;
  last_ok: boolean | null;
}

const DEFAULT_MODEL = "google/gemini-2.5-flash";

async function ensureAdmin(supabase: unknown, userId: string) {
  const rpc = supabase as {
    rpc: (n: string, a: Record<string, unknown>) => Promise<{ data: unknown }>;
  };
  const [{ data: a }, { data: s }] = await Promise.all([
    rpc.rpc("has_role", { _user_id: userId, _role: "admin" }),
    rpc.rpc("has_role", { _user_id: userId, _role: "super_admin" }),
  ]);
  if (!a && !s) throw new Error("Forbidden");
}

export const listDemoEvaluations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const sb = context.supabase as unknown as {
      from: (t: string) => {
        select: (s: string) => {
          order: (c: string, o: { ascending: boolean }) => Promise<{ data: unknown }>;
        };
      };
    };
    const { data } = await sb
      .from("alux_evaluations")
      .select(
        "id, suite, question, locale, expected_entities, forbidden_terms, last_answer, last_score, last_hallucination_risk, last_latency_ms, last_matched_entities, last_missing_entities, last_run_at, last_ok",
      )
      .order("created_at", { ascending: true });
    return ((data as DemoEvaluation[] | null) ?? []).map((r) => ({
      ...r,
      expected_entities: r.expected_entities ?? [],
      forbidden_terms: r.forbidden_terms ?? [],
      last_matched_entities: r.last_matched_entities ?? [],
      last_missing_entities: r.last_missing_entities ?? [],
    }));
  });

const RunInput = z.object({ id: z.string().uuid().optional() });

function scoreAnswer(answer: string, expected: string[], forbidden: string[]) {
  const hay = answer.toLowerCase();
  const matched = expected.filter((e) => hay.includes(e.toLowerCase()));
  const missing = expected.filter((e) => !hay.includes(e.toLowerCase()));
  const forbiddenHits = forbidden.filter((f) => hay.includes(f.toLowerCase()));
  const base = expected.length ? matched.length / expected.length : 1;
  const penalty = forbiddenHits.length * 0.34;
  return {
    score: Math.max(0, Math.min(1, base - penalty)),
    matched,
    missing,
    forbiddenHits,
  };
}

function hallucinationRisk(answer: string, kbBlock: string): number {
  const bold = Array.from(answer.matchAll(/\*\*([^*]{3,80})\*\*/g)).map((m) => m[1]);
  if (!bold.length) return 0;
  const hay = kbBlock.toLowerCase();
  const unk = bold.filter((b) => !hay.includes(b.toLowerCase()));
  return Math.min(1, unk.length / bold.length);
}

export const runDemoEvaluations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => RunInput.parse(d ?? {}))
  .handler(async ({ context, data }) => {
    await ensureAdmin(context.supabase, context.userId);
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = supabaseAdmin as any;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q: any = admin.from("alux_evaluations").select("*");
    if (data.id) q = q.eq("id", data.id);
    const { data: rows } = await q;
    const evals = (rows as Array<DemoEvaluation & { id: string }>) ?? [];

    const provider = createLovableAiGatewayProvider(key);
    const results: Array<{ id: string; ok: boolean; score: number }> = [];

    for (const ev of evals) {
      const matches = await retrieveAluxKnowledgeServer(
        context.supabase,
        ev.question,
        { matchCount: 4, locale: ev.locale },
      );
      const kbBlock = knowledgeToPromptBlock(matches, { locale: ev.locale });
      const t0 = Date.now();
      let text = "";
      try {
        const gen = await generateText({
          model: provider(DEFAULT_MODEL),
          system:
            "Eres Alux, copiloto turístico del Oriente Maya de Yucatán. Responde SOLO con información del bloque de contexto entregado. Si no hay datos suficientes, dilo con claridad y no inventes negocios, precios ni horarios. Cita los nombres tal cual aparecen en las referencias.",
          prompt: `Pregunta del viajero: ${ev.question}\n\n${kbBlock || "(Sin contexto de KB para esta pregunta.)"}`,
        });
        text = gen.text;
      } catch (e) {
        text = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
      }
      const latency = Date.now() - t0;
      const scored = scoreAnswer(text, ev.expected_entities ?? [], ev.forbidden_terms ?? []);
      const risk = hallucinationRisk(text, kbBlock);
      const ok =
        scored.score >= 0.5 &&
        scored.forbiddenHits.length === 0 &&
        !text.startsWith("ERROR");

      await admin
        .from("alux_evaluations")
        .update({
          last_answer: text.slice(0, 4000),
          last_score: scored.score,
          last_hallucination_risk: risk,
          last_latency_ms: latency,
          last_matched_entities: scored.matched,
          last_missing_entities: scored.missing,
          last_ok: ok,
          last_run_at: new Date().toISOString(),
          meta: {
            forbidden_hits: scored.forbiddenHits,
            kb_matches: matches.length,
          },
        })
        .eq("id", ev.id);

      results.push({ id: ev.id, ok, score: scored.score });
    }

    return { ran: results.length, results };
  });
