/**
 * CV8.S.4 · Persistencia + orquestación de simulaciones — Server Functions.
 *
 * Único canal autorizado para escribir/leer/eliminar simulaciones.
 * Cumple:
 *  - Founder Safe Simulation Operations Principle (persistencia por run_id,
 *    Wipe seguro, idempotencia, aislamiento).
 *  - Founder Simulation Isolation Principle (is_simulation=true obligatorio).
 *  - Founder Reproducible Simulation Principle (mismo escenario+seed = mismo digest).
 *
 * Autorización: admin | super_admin.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import {
  SimulationScaleSchema,
  type SimulationScale,
} from "./scenario";
import { runScenario } from "./engine";
import {
  buildOrienteMayaScenario,
  DEFAULT_SCENARIO_ID,
  DEFAULT_SCENARIO_VERSION,
  estimateVolume,
} from "./scenarios/oriente-maya-90d";
import type { SimulatedEvent } from "./behavior";

const BULK_CHUNK = 500;

// ── Guard: sólo admin/super_admin ──────────────────────────────────────
async function requireAdmin(context: {
  supabase: {
    rpc: (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: boolean | null; error: unknown }>;
  };
  userId: string;
}): Promise<void> {
  const [{ data: isAdmin }, { data: isSuper }] = await Promise.all([
    context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
    context.supabase.rpc("has_role", { _user_id: context.userId, _role: "super_admin" }),
  ]);
  if (!isAdmin && !isSuper) throw new Response("Forbidden", { status: 403 });
}

// ── Contratos ──────────────────────────────────────────────────────────
export type SimulationRunStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "wiped";

export interface SimulationRunSummary {
  run_id: string;
  scenario_id: string;
  scenario_version: string;
  seed: string;
  scale: SimulationScale;
  status: SimulationRunStatus;
  started_at: string;
  completed_at: string | null;
  wiped_at: string | null;
  rows_inserted: Record<string, unknown>;
  triggered_by: string | null;
  error_message: string | null;
}

// ── Preview (sin efectos) ──────────────────────────────────────────────
const PreviewInput = z.object({
  scale: SimulationScaleSchema,
  seed: z.string().min(1).max(128),
});

export const previewSimulationRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => PreviewInput.parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const scenario = buildOrienteMayaScenario({ seed: data.seed, scale: data.scale });
    const volume = estimateVolume(data.scale);
    return {
      scenario_id: scenario.scenario_id,
      scenario_version: scenario.scenario_version,
      seed: scenario.seed,
      scale: scenario.scale,
      calendar: scenario.calendar,
      volume,
      allow_full:
        (process.env.SIMULATION_ALLOW_FULL ?? "").toLowerCase() === "true",
    };
  });

// ── Ejecutar + persistir ───────────────────────────────────────────────
const ExecuteInput = z.object({
  scale: SimulationScaleSchema,
  seed: z.string().min(1).max(128),
  confirm_full: z.boolean().optional().default(false),
});

type AdminChain = {
  schema: (s: string) => {
    from: (t: string) => any; // eslint-disable-line @typescript-eslint/no-explicit-any
  };
};

function eventToRow(ev: SimulatedEvent) {
  const e = ev.event;
  return {
    event_id: e.event_id,
    occurred_at: e.occurred_at,
    schema_version: e.schema_version,
    kind: e.kind,
    subject_id: e.subject.subject_id,
    trust_level: e.subject.trust_level,
    is_authenticated: e.subject.is_authenticated,
    locale: e.subject.locale ?? null,
    destination_id: e.context.destination_id ?? null,
    surface: e.context.surface,
    route: e.context.route,
    travel_stage: e.context.travel_stage ?? null,
    live_day_phase: e.context.live_day_phase ?? null,
    payload: { ...e, causality: ev.causality },
    retention_bucket: "R_30D",
    is_simulation: true,
    simulation_run_id: ev.simulation_run_id,
  };
}

export const executeSimulationRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => ExecuteInput.parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);

    if (data.scale === "full") {
      const allow = (process.env.SIMULATION_ALLOW_FULL ?? "").toLowerCase() === "true";
      if (!allow) {
        throw new Response(
          "Escala 'full' bloqueada en este entorno. Configure SIMULATION_ALLOW_FULL=true.",
          { status: 403 },
        );
      }
      if (!data.confirm_full) {
        throw new Response("Doble confirmación requerida para escala 'full'.", {
          status: 400,
        });
      }
    }

    const scenario = buildOrienteMayaScenario({ seed: data.seed, scale: data.scale });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as unknown as AdminChain;

    // 1) Crear el run (status=running).
    const startedAt = new Date().toISOString();
    const { data: inserted, error: insertErr } = await admin
      .schema("visitor_intel")
      .from("simulation_runs")
      .insert({
        scenario_id: scenario.scenario_id,
        scenario_version: scenario.scenario_version,
        seed: scenario.seed,
        scale: scenario.scale,
        scenario_payload: scenario,
        status: "running",
        started_at: startedAt,
        triggered_by: context.userId,
      })
      .select("run_id")
      .single();
    if (insertErr || !inserted) {
      console.error("[cv8.s.4] create run failed", insertErr);
      throw new Response("No se pudo crear la corrida", { status: 500 });
    }
    const runId = (inserted as { run_id: string }).run_id;

    try {
      // 2) Ejecutar el escenario en memoria (determinístico).
      const result = runScenario({ scenario, runId });

      // 3) Bulk insert en chunks (idempotente por event_id).
      const rows = result.events.map(eventToRow);
      let insertedRows = 0;
      for (let i = 0; i < rows.length; i += BULK_CHUNK) {
        const slice = rows.slice(i, i + BULK_CHUNK);
        const { error } = await admin
          .schema("visitor_intel")
          .from("events")
          .upsert(slice, { onConflict: "event_id", ignoreDuplicates: true });
        if (error) throw new Error(String((error as { message?: string }).message ?? error));
        insertedRows += slice.length;
      }

      // 4) Cerrar run.
      await admin
        .schema("visitor_intel")
        .from("simulation_runs")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          rows_inserted: {
            events: insertedRows,
            visitors: result.stats.visitors,
            revenue_usd: result.stats.commerce_revenue_usd,
          },
        })
        .eq("run_id", runId);

      return {
        run_id: runId,
        status: "completed" as const,
        stats: result.stats,
      };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error desconocido durante la ejecución";
      await admin
        .schema("visitor_intel")
        .from("simulation_runs")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
          error_message: message.slice(0, 500),
        })
        .eq("run_id", runId);
      console.error("[cv8.s.4] run failed", err);
      throw new Response(`Simulación falló: ${message}`, { status: 500 });
    }
  });

// ── Historial ──────────────────────────────────────────────────────────
export const listSimulationRuns = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ limit: z.number().min(1).max(200).default(50) }).parse(data ?? {}),
  )
  .handler(async ({ data, context }): Promise<SimulationRunSummary[]> => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as unknown as AdminChain;
    const { data: rows, error } = await admin
      .schema("visitor_intel")
      .from("simulation_runs")
      .select(
        "run_id, scenario_id, scenario_version, seed, scale, status, started_at, completed_at, wiped_at, rows_inserted, triggered_by, error_message",
      )
      .order("started_at", { ascending: false })
      .limit(data.limit);
    if (error) {
      console.error("[cv8.s.4] list runs failed", error);
      throw new Response("Read failed", { status: 500 });
    }
    return (rows ?? []) as SimulationRunSummary[];
  });

// ── Wipe seguro (por run_id únicamente) ────────────────────────────────
const WipeInput = z.object({
  run_id: z.string().uuid(),
  confirm_phrase: z.literal("BORRAR SIMULACION"),
});

export const wipeSimulationRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => WipeInput.parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as unknown as AdminChain;

    // 1) DELETE sólo por simulation_run_id (aislamiento absoluto).
    const { error: delErr, count } = await admin
      .schema("visitor_intel")
      .from("events")
      .delete({ count: "exact" })
      .eq("simulation_run_id", data.run_id);
    if (delErr) {
      console.error("[cv8.s.4] wipe events failed", delErr);
      throw new Response("Wipe failed", { status: 500 });
    }

    // 2) Marcar el run como wiped (evidencia administrativa).
    await admin
      .schema("visitor_intel")
      .from("simulation_runs")
      .update({ status: "wiped", wiped_at: new Date().toISOString() })
      .eq("run_id", data.run_id);

    return { run_id: data.run_id, deleted_events: count ?? 0 };
  });

// ── Info del escenario por defecto ─────────────────────────────────────
export const getDefaultScenarioInfo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    return {
      scenario_id: DEFAULT_SCENARIO_ID,
      scenario_version: DEFAULT_SCENARIO_VERSION,
      volumes: {
        light: estimateVolume("light"),
        medium: estimateVolume("medium"),
        full: estimateVolume("full"),
      },
      allow_full:
        (process.env.SIMULATION_ALLOW_FULL ?? "").toLowerCase() === "true",
    };
  });