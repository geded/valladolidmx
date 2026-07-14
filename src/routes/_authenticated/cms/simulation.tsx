/**
 * CV8.S.4 · Simulation Console (Founder / Admin).
 *
 * Superficie oficial para operar simulaciones del Visitor Intelligence.
 * Cumple Founder Safe Simulation Operations Principle:
 *  · Selección explícita de escenario, escala y seed.
 *  · Preview de volumen antes de ejecutar.
 *  · Doble confirmación reforzada para escala full.
 *  · Historial completo con estado y evidencia.
 *  · Wipe seguro por simulation_run_id (frase de confirmación).
 *  · Modo real / simulación / combinada — banner persistente en la consola.
 */
import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import {
  previewSimulationRun,
  executeSimulationRun,
  listSimulationRuns,
  wipeSimulationRun,
  getDefaultScenarioInfo,
  type SimulationRunSummary,
} from "@/lib/visitor-intel/simulation/persistence.functions";
import type { SimulationScale } from "@/lib/visitor-intel/simulation/scenario";

export const Route = createFileRoute("/_authenticated/cms/simulation")({
  head: () => ({
    meta: [
      { title: "Simulation Console · CV8.S.4 · Valladolid.mx" },
      {
        name: "description",
        content:
          "Consola oficial para ejecutar, auditar y eliminar simulaciones del Visitor Intelligence.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: SimulationConsole,
});

const SCALES: Array<{ id: SimulationScale; label: string; desc: string }> = [
  { id: "light", label: "Ligera (1k)", desc: "~15k eventos · demo rápida" },
  { id: "medium", label: "Media (10k)", desc: "~150k eventos · validación completa" },
  { id: "full", label: "Plena (100k)", desc: "~1.5M eventos · requiere doble confirmación" },
];

function fmt(n: number): string {
  return new Intl.NumberFormat("es-MX").format(n);
}

function SimulationConsole() {
  const qc = useQueryClient();
  const previewFn = useServerFn(previewSimulationRun);
  const executeFn = useServerFn(executeSimulationRun);
  const listFn = useServerFn(listSimulationRuns);
  const wipeFn = useServerFn(wipeSimulationRun);
  const infoFn = useServerFn(getDefaultScenarioInfo);

  const [scale, setScale] = useState<SimulationScale>("light");
  const [seed, setSeed] = useState("VMX-DEMO-01");
  const [confirmFull, setConfirmFull] = useState(false);
  const [wipeTarget, setWipeTarget] = useState<SimulationRunSummary | null>(null);
  const [wipePhrase, setWipePhrase] = useState("");

  const info = useQuery({
    queryKey: ["cv8s4", "info"],
    queryFn: () => infoFn({ data: {} }),
    staleTime: 5 * 60_000,
  });

  const preview = useQuery({
    queryKey: ["cv8s4", "preview", scale, seed],
    queryFn: () => previewFn({ data: { scale, seed } }),
    staleTime: 60_000,
    enabled: seed.length > 0,
  });
  // (info fn takes no input; wrapper accepts empty object)

  const runs = useQuery({
    queryKey: ["cv8s4", "runs"],
    queryFn: () => listFn({ data: { limit: 50 } }),
    staleTime: 15_000,
  });

  const execute = useMutation({
    mutationFn: () =>
      executeFn({ data: { scale, seed, confirm_full: confirmFull } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cv8s4", "runs"] });
      setConfirmFull(false);
    },
  });

  const wipe = useMutation({
    mutationFn: (runId: string) =>
      wipeFn({
        data: { run_id: runId, confirm_phrase: "BORRAR SIMULACION" as const },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cv8s4", "runs"] });
      setWipeTarget(null);
      setWipePhrase("");
    },
  });

  const allowFull = info.data?.allow_full ?? false;
  const disabled =
    execute.isPending ||
    (scale === "full" && (!allowFull || !confirmFull));

  const activeRuns = useMemo(
    () => (runs.data?.runs ?? []).filter((r) => r.status !== "wiped"),
    [runs.data],
  );

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <header className="border-b border-border pb-5">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
          CV8.S.4 · Simulation Console
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Motor de simulación del Destination OS
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Ensaya operación, capacitación y validación del Oriente Maya sin
          afectar datos reales. Cada corrida es explícita, identificable,
          reversible y auditable.
        </p>
      </header>

      <div className="rounded-lg border-2 border-amber-500 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
        <strong>🧪 Modo simulación.</strong> Los eventos generados aquí llevan{" "}
        <code className="rounded bg-amber-100 px-1 dark:bg-amber-900/40">
          is_simulation = true
        </code>{" "}
        y viven aislados en <code>visitor_intel.events</code> por{" "}
        <code>simulation_run_id</code>. El Wipe sólo elimina un run; los
        registros administrativos se preservan como evidencia.
      </div>

      {/* ── Configurador ─────────────────────────────────────────────── */}
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">Configurar corrida</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Escenario:{" "}
          <strong>{info.data?.scenario_id ?? "oriente-maya-90d"}</strong>{" "}
          v{info.data?.scenario_version ?? "1.0.0"}
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Escala
            </label>
            <div className="mt-2 space-y-2">
              {SCALES.map((s) => (
                <label
                  key={s.id}
                  className={
                    "flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm " +
                    (scale === s.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50")
                  }
                >
                  <input
                    type="radio"
                    name="scale"
                    checked={scale === s.id}
                    onChange={() => {
                      setScale(s.id);
                      setConfirmFull(false);
                    }}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium">{s.label}</div>
                    <div className="text-xs text-muted-foreground">{s.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Seed (determinística)
              </label>
              <input
                type="text"
                value={seed}
                onChange={(e) => setSeed(e.target.value)}
                className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                placeholder="p.ej. VMX-DEMO-01"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Misma seed + mismo escenario ⇒ misma corrida byte-a-byte.
              </p>
            </div>

            {preview.data && (
              <div className="rounded-md border border-border bg-muted/30 p-3 text-xs">
                <div className="font-semibold text-foreground">
                  Estimación previa
                </div>
                <ul className="mt-1 space-y-0.5 text-muted-foreground">
                  <li>Visitantes: {fmt(preview.data.volume.visitors)}</li>
                  <li>
                    Eventos: ≈ {fmt(preview.data.volume.events_low)} –{" "}
                    {fmt(preview.data.volume.events_high)}
                  </li>
                  <li>
                    Almacenamiento: ≈ {preview.data.volume.storage_mb_low}–
                    {preview.data.volume.storage_mb_high} MB
                  </li>
                  <li>
                    Ventana:{" "}
                    {new Date(preview.data.calendar.start_date).toLocaleDateString(
                      "es-MX",
                    )}{" "}
                    →{" "}
                    {new Date(preview.data.calendar.end_date).toLocaleDateString(
                      "es-MX",
                    )}
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>

        {scale === "full" && (
          <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
            <strong className="text-destructive">Confirmación reforzada.</strong>
            <p className="mt-1 text-xs text-muted-foreground">
              La escala plena (100,000 visitantes) puede generar ~1.5M eventos.
              {allowFull
                ? " Marca la casilla para autorizar."
                : " Bloqueada en este entorno (configure SIMULATION_ALLOW_FULL=true)."}
            </p>
            <label className="mt-2 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={confirmFull}
                disabled={!allowFull}
                onChange={(e) => setConfirmFull(e.target.checked)}
              />
              Entiendo el volumen y el costo. Autorizo ejecutar en full.
            </label>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => execute.mutate()}
            disabled={disabled}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {execute.isPending ? "Ejecutando…" : "Ejecutar simulación"}
          </button>
          {execute.isError && (
            <span className="text-xs text-destructive">
              {(execute.error as Error)?.message ?? "Falló la ejecución"}
            </span>
          )}
          {execute.isSuccess && (
            <span className="text-xs text-emerald-600">
              Corrida completada · run {execute.data.run_id.slice(0, 8)}…
            </span>
          )}
        </div>
      </section>

      {/* ── Historial ────────────────────────────────────────────────── */}
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-lg font-semibold">Historial de corridas</h2>
            <p className="text-xs text-muted-foreground">
              Todas las corridas quedan como evidencia — incluso tras Wipe.
            </p>
          </div>
          <div className="text-xs text-muted-foreground">
            {activeRuns.length} activas · {(runs.data?.runs.length ?? 0) - activeRuns.length} wiped
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="py-2 text-left">Run</th>
                <th className="py-2 text-left">Escala</th>
                <th className="py-2 text-left">Seed</th>
                <th className="py-2 text-left">Estado</th>
                <th className="py-2 text-left">Eventos</th>
                <th className="py-2 text-left">Iniciada</th>
                <th className="py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {(runs.data?.runs ?? []).map((r) => {
                const events =
                  (r.rows_inserted as { events?: number })?.events ?? 0;
                return (
                  <tr key={r.run_id} className="border-b border-border/50">
                    <td className="py-2 font-mono text-xs">
                      {r.run_id.slice(0, 8)}…
                    </td>
                    <td className="py-2">{r.scale}</td>
                    <td className="py-2 font-mono text-xs">{r.seed}</td>
                    <td className="py-2">
                      <span
                        className={
                          "rounded-full px-2 py-0.5 text-xs " +
                          (r.status === "completed"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
                            : r.status === "running"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200"
                              : r.status === "wiped"
                                ? "bg-muted text-muted-foreground"
                                : "bg-destructive/10 text-destructive")
                        }
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="py-2">{events ? fmt(events) : "—"}</td>
                    <td className="py-2 text-xs text-muted-foreground">
                      {new Date(r.started_at).toLocaleString("es-MX")}
                    </td>
                    <td className="py-2 text-right">
                      <div className="inline-flex gap-2">
                        {r.status === "completed" && (
                          <>
                            <Link
                              to="/cms/visitor-intel"
                              search={{ mode: "simulation", run: r.run_id }}
                              className="rounded-md border border-border px-2 py-1 text-xs"
                            >
                              Ver simulación
                            </Link>
                            <Link
                              to="/cms/visitor-intel"
                              search={{ mode: "combined", run: r.run_id }}
                              className="rounded-md border border-border px-2 py-1 text-xs"
                            >
                              Combinado
                            </Link>
                            <button
                              type="button"
                              onClick={() => setWipeTarget(r)}
                              className="rounded-md border border-destructive/40 px-2 py-1 text-xs text-destructive"
                            >
                              Wipe
                            </button>
                          </>
                        )}
                        {r.status === "failed" && r.error_message && (
                          <span
                            title={r.error_message}
                            className="text-xs text-destructive"
                          >
                            ⚠ error
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {(runs.data?.runs.length ?? 0) === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="py-6 text-center text-sm text-muted-foreground"
                  >
                    Aún no hay corridas. Configura una arriba y ejecuta.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Modal Wipe ───────────────────────────────────────────────── */}
      {wipeTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-xl border border-destructive/40 bg-card p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-destructive">
              Confirmar Wipe de simulación
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Se eliminarán todos los eventos con{" "}
              <code>simulation_run_id = {wipeTarget.run_id.slice(0, 8)}…</code>.
              El registro del run se conservará como evidencia con estado{" "}
              <strong>wiped</strong>. Esta acción no se puede deshacer.
            </p>
            <label className="mt-4 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Escribe <code>BORRAR SIMULACION</code> para confirmar
            </label>
            <input
              type="text"
              value={wipePhrase}
              onChange={(e) => setWipePhrase(e.target.value)}
              className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
            {wipe.isError && (
              <p className="mt-2 text-xs text-destructive">
                {(wipe.error as Error)?.message ?? "No se pudo eliminar"}
              </p>
            )}
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setWipeTarget(null);
                  setWipePhrase("");
                }}
                className="rounded-md border border-border px-3 py-2 text-sm"
                disabled={wipe.isPending}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={
                  wipePhrase !== "BORRAR SIMULACION" || wipe.isPending
                }
                onClick={() => wipe.mutate(wipeTarget.run_id)}
                className="rounded-md bg-destructive px-3 py-2 text-sm font-medium text-destructive-foreground disabled:opacity-50"
              >
                {wipe.isPending ? "Eliminando…" : "Ejecutar Wipe"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}