/**
 * Ola A20 · Panel de calidad de Alux (admin-only).
 *
 * Agrega métricas heurísticas ya emitidas por `runAluxTraveler` dentro
 * de `alux_traveler_suggestions.meta`:
 *  - hallucination_risk (0..1)
 *  - low_context (bool)
 *  - latency_ms
 *  - kb_matches
 *  - sources_count
 *  - model (para separar low_context_guard del gateway real)
 *
 * No censura respuestas — sólo instrumenta.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({
  days: z.union([z.literal(7), z.literal(30), z.literal(90)]).default(30),
});

export interface AluxQualityRow {
  capability: string;
  total: number;
  low_context: number;
  low_context_rate: number;
  avg_hallucination_risk: number;
  high_hallucination_rate: number; // % con risk > 0.5
  avg_latency_ms: number;
  p95_latency_ms: number;
  avg_kb_matches: number;
  no_sources_rate: number;
}

export interface AluxQualityPoint {
  day: string; // ISO date
  total: number;
  avg_hallucination_risk: number;
  low_context_rate: number;
  avg_latency_ms: number;
}

export interface AluxQualityStats {
  since: string;
  days: number;
  total: number;
  overall: {
    low_context_rate: number;
    avg_hallucination_risk: number;
    high_hallucination_rate: number;
    avg_latency_ms: number;
    p95_latency_ms: number;
    avg_kb_matches: number;
  };
  per_capability: AluxQualityRow[];
  per_day: AluxQualityPoint[];
  recent_high_risk: Array<{
    id: string;
    created_at: string;
    capability: string;
    hallucination_risk: number;
    unknown_mentions: string[];
    model: string | null;
    latency_ms: number | null;
  }>;
}

function num(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

export const getAluxQualityStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d ?? {}))
  .handler(async ({ context, data }) => {
    // Admin check (defensa en profundidad; RLS ya lo permite).
    const rpc = context.supabase as unknown as {
      rpc: (n: string, a: Record<string, unknown>) => Promise<{ data: unknown }>;
    };
    const [{ data: isAdmin }, { data: isSuper }] = await Promise.all([
      rpc.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
      rpc.rpc("has_role", { _user_id: context.userId, _role: "super_admin" }),
    ]);
    if (!isAdmin && !isSuper) throw new Error("Forbidden");

    const since = new Date(Date.now() - data.days * 24 * 60 * 60 * 1000).toISOString();
    const sb = context.supabase as unknown as {
      from: (t: string) => {
        select: (s: string) => {
          gte: (a: string, b: string) => {
            order: (a: string, o: { ascending: boolean }) => {
              limit: (n: number) => Promise<{
                data: Array<{
                  id: string;
                  capability: string;
                  meta: Record<string, unknown> | null;
                  created_at: string;
                }> | null;
                error: { message: string } | null;
              }>;
            };
          };
        };
      };
    };

    const { data: rows, error } = await sb
      .from("alux_traveler_suggestions")
      .select("id, capability, meta, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(10000);
    if (error) throw new Error(error.message);
    const all = rows ?? [];

    const latencies: number[] = [];
    let sumRisk = 0;
    let riskCount = 0;
    let highRisk = 0;
    let lowCtx = 0;
    let sumKb = 0;
    let kbCount = 0;

    // Aggregate per capability + per day.
    const perCap = new Map<
      string,
      {
        total: number;
        low_context: number;
        sumRisk: number;
        riskCount: number;
        highRisk: number;
        latencies: number[];
        sumKb: number;
        kbCount: number;
        noSources: number;
      }
    >();
    const perDay = new Map<
      string,
      { total: number; sumRisk: number; riskCount: number; low: number; sumLat: number; latCount: number }
    >();

    const highRiskItems: AluxQualityStats["recent_high_risk"] = [];

    for (const r of all) {
      const m = (r.meta ?? {}) as Record<string, unknown>;
      const risk = num(m.hallucination_risk, NaN);
      const low = m.low_context === true;
      const lat = num(m.latency_ms, NaN);
      const kb = num(m.kb_matches, NaN);
      const srcs = num(m.sources_count, NaN);
      const day = r.created_at.slice(0, 10);

      const cap = perCap.get(r.capability) ?? {
        total: 0,
        low_context: 0,
        sumRisk: 0,
        riskCount: 0,
        highRisk: 0,
        latencies: [],
        sumKb: 0,
        kbCount: 0,
        noSources: 0,
      };
      cap.total += 1;
      if (low) cap.low_context += 1;
      if (Number.isFinite(risk)) {
        cap.sumRisk += risk;
        cap.riskCount += 1;
        if (risk > 0.5) cap.highRisk += 1;
      }
      if (Number.isFinite(lat)) cap.latencies.push(lat);
      if (Number.isFinite(kb)) {
        cap.sumKb += kb;
        cap.kbCount += 1;
      }
      if (Number.isFinite(srcs) && srcs === 0) cap.noSources += 1;
      perCap.set(r.capability, cap);

      const d = perDay.get(day) ?? {
        total: 0,
        sumRisk: 0,
        riskCount: 0,
        low: 0,
        sumLat: 0,
        latCount: 0,
      };
      d.total += 1;
      if (low) d.low += 1;
      if (Number.isFinite(risk)) {
        d.sumRisk += risk;
        d.riskCount += 1;
      }
      if (Number.isFinite(lat)) {
        d.sumLat += lat;
        d.latCount += 1;
      }
      perDay.set(day, d);

      // Overall.
      if (low) lowCtx += 1;
      if (Number.isFinite(risk)) {
        sumRisk += risk;
        riskCount += 1;
        if (risk > 0.5) highRisk += 1;
      }
      if (Number.isFinite(lat)) latencies.push(lat);
      if (Number.isFinite(kb)) {
        sumKb += kb;
        kbCount += 1;
      }

      if (Number.isFinite(risk) && risk > 0.5 && highRiskItems.length < 15) {
        const unk = Array.isArray(m.unknown_mentions)
          ? (m.unknown_mentions as unknown[]).filter((x): x is string => typeof x === "string")
          : [];
        highRiskItems.push({
          id: r.id,
          created_at: r.created_at,
          capability: r.capability,
          hallucination_risk: risk,
          unknown_mentions: unk,
          model: typeof m.model === "string" ? m.model : null,
          latency_ms: Number.isFinite(lat) ? lat : null,
        });
      }
    }

    const latSorted = [...latencies].sort((a, b) => a - b);

    const per_capability: AluxQualityRow[] = Array.from(perCap.entries())
      .map(([capability, c]) => {
        const cs = [...c.latencies].sort((a, b) => a - b);
        return {
          capability,
          total: c.total,
          low_context: c.low_context,
          low_context_rate: c.total ? c.low_context / c.total : 0,
          avg_hallucination_risk: c.riskCount ? c.sumRisk / c.riskCount : 0,
          high_hallucination_rate: c.riskCount ? c.highRisk / c.riskCount : 0,
          avg_latency_ms: cs.length ? cs.reduce((a, b) => a + b, 0) / cs.length : 0,
          p95_latency_ms: percentile(cs, 95),
          avg_kb_matches: c.kbCount ? c.sumKb / c.kbCount : 0,
          no_sources_rate: c.total ? c.noSources / c.total : 0,
        };
      })
      .sort((a, b) => b.total - a.total);

    const per_day: AluxQualityPoint[] = Array.from(perDay.entries())
      .map(([day, d]) => ({
        day,
        total: d.total,
        avg_hallucination_risk: d.riskCount ? d.sumRisk / d.riskCount : 0,
        low_context_rate: d.total ? d.low / d.total : 0,
        avg_latency_ms: d.latCount ? d.sumLat / d.latCount : 0,
      }))
      .sort((a, b) => a.day.localeCompare(b.day));

    const stats: AluxQualityStats = {
      since,
      days: data.days,
      total: all.length,
      overall: {
        low_context_rate: all.length ? lowCtx / all.length : 0,
        avg_hallucination_risk: riskCount ? sumRisk / riskCount : 0,
        high_hallucination_rate: riskCount ? highRisk / riskCount : 0,
        avg_latency_ms: latSorted.length
          ? latSorted.reduce((a, b) => a + b, 0) / latSorted.length
          : 0,
        p95_latency_ms: percentile(latSorted, 95),
        avg_kb_matches: kbCount ? sumKb / kbCount : 0,
      },
      per_capability,
      per_day,
      recent_high_risk: highRiskItems,
    };

    return stats;
  });