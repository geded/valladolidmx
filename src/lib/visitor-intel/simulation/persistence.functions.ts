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

import { SimulationScaleSchema, type SimulationScale } from "./scenario";
import { runScenario } from "./engine";
import {
  buildOrienteMayaScenario,
  DEFAULT_SCENARIO_ID,
  DEFAULT_SCENARIO_VERSION,
  DEFAULT_SCENARIO_SEED,
  estimateVolume,
} from "./scenarios/oriente-maya-90d";
import type { SimulatedEvent } from "./behavior";

const BULK_CHUNK = 500;

// ── Guard: sólo admin/super_admin ──────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function requireAdmin(context: { supabase: any; userId: string }): Promise<void> {
  const [{ data: isAdmin }, { data: isSuper }] = await Promise.all([
    context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
    context.supabase.rpc("has_role", { _user_id: context.userId, _role: "super_admin" }),
  ]);
  if (!isAdmin && !isSuper) throw new Response("Forbidden", { status: 403 });
}

// ── Contratos ──────────────────────────────────────────────────────────
export type SimulationRunStatus = "pending" | "running" | "completed" | "failed" | "wiped";

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
  rows_inserted: Record<string, number | string | null>;
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
      allow_full: (process.env.SIMULATION_ALLOW_FULL ?? "").toLowerCase() === "true",
    };
  });

// ── Ejecutar + persistir ───────────────────────────────────────────────
const ExecuteInput = z.object({
  scale: SimulationScaleSchema,
  seed: z.string().min(1).max(128),
  confirm_full: z.boolean().optional().default(false),
});

// `visitor_intel` no está expuesto en la Data API: todo pasa por funciones
// internas `public.visitor_intel_*_simulation_*` (sólo service_role).
type RpcClient = {
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { code?: string; message: string } | null }>;
};

async function adminRpc(): Promise<RpcClient> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as RpcClient;
}

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
    const admin = await adminRpc();

    // 1) Crear el run (status=running).
    const { data: inserted, error: insertErr } = await admin.rpc(
      "visitor_intel_create_simulation_run",
      {
        _scenario_id: scenario.scenario_id,
        _scenario_version: scenario.scenario_version,
        _seed: scenario.seed,
        _scale: scenario.scale,
        _scenario_payload: scenario,
        _triggered_by: context.userId,
      },
    );
    if (insertErr || typeof inserted !== "string") {
      console.error("[cv8.s.4] create run failed", insertErr);
      throw new Response("No se pudo crear la prueba", { status: 500 });
    }
    const runId = inserted;

    try {
      // 2) Ejecutar el escenario en memoria (determinístico).
      const result = runScenario({ scenario, runId });

      // 3) Bulk insert en chunks (idempotente por event_id).
      const rows = result.events.map(eventToRow);
      let insertedRows = 0;
      for (let i = 0; i < rows.length; i += BULK_CHUNK) {
        const slice = rows.slice(i, i + BULK_CHUNK);
        const { data: count, error } = await admin.rpc("visitor_intel_insert_simulation_events", {
          _run_id: runId,
          _rows: slice,
        });
        if (error) throw new Error(error.message);
        insertedRows += typeof count === "number" ? count : 0;
      }

      // 4) Cerrar run.
      const { error: finishErr } = await admin.rpc("visitor_intel_finish_simulation_run", {
        _run_id: runId,
        _status: "completed",
        _rows_inserted: {
          events: insertedRows,
          visitors: result.stats.visitors,
          revenue_usd: result.stats.commerce_revenue_usd,
        },
        _error_message: null,
      });
      if (finishErr) throw new Error(finishErr.message);

      return {
        run_id: runId,
        status: "completed" as const,
        stats: result.stats,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido durante la ejecución";
      await admin.rpc("visitor_intel_finish_simulation_run", {
        _run_id: runId,
        _status: "failed",
        _rows_inserted: null,
        _error_message: message.slice(0, 500),
      });
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
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const admin = await adminRpc();
    const { data: rows, error } = await admin.rpc("visitor_intel_list_simulation_runs", {
      _limit: data.limit,
    });
    if (error) {
      console.error("[cv8.s.4] list runs failed", error);
      throw new Response("Read failed", { status: 500 });
    }
    return { runs: (Array.isArray(rows) ? rows : []) as SimulationRunSummary[] };
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
    const admin = await adminRpc();

    // Borra sólo las visitas simuladas de esta prueba y la marca como borrada;
    // las visitas reales siguen protegidas contra borrado.
    const { data: count, error } = await admin.rpc("visitor_intel_wipe_simulation_run", {
      _run_id: data.run_id,
    });
    if (error) {
      console.error("[cv8.s.4] wipe failed", error);
      throw new Response("No se pudo borrar la prueba", { status: 500 });
    }

    return { run_id: data.run_id, deleted_events: Number(count ?? 0) };
  });

// ── Info del escenario por defecto ─────────────────────────────────────
export const getDefaultScenarioInfo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    return {
      scenario_id: DEFAULT_SCENARIO_ID,
      scenario_version: DEFAULT_SCENARIO_VERSION,
      default_seed: DEFAULT_SCENARIO_SEED,
      volumes: {
        light: estimateVolume("light"),
        medium: estimateVolume("medium"),
        full: estimateVolume("full"),
      },
      allow_full: (process.env.SIMULATION_ALLOW_FULL ?? "").toLowerCase() === "true",
    };
  });
