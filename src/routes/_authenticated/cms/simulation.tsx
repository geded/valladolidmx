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
      { title: "Pruebas con visitantes simulados · Valladolid.mx" },
      {
        name: "description",
        content:
          "Crea, revisa y borra visitantes de práctica para probar el monitor sin tocar las cifras reales.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: SimulationConsole,
});

const SCALES: Array<{ id: SimulationScale; label: string; desc: string }> = [
  {
    id: "light",
    label: "Pequeña (1,000 visitantes)",
    desc: "Unos 3,000 movimientos · prueba rápida",
  },
  {
    id: "medium",
    label: "Mediana (10,000 visitantes)",
    desc: "Unos 30,000 movimientos · prueba completa",
  },
  {
    id: "full",
    label: "Grande (100,000 visitantes)",
    desc: "Unos 300,000 movimientos · pide doble confirmación",
  },
];

const SCALE_NAMES: Record<string, string> = {
  light: "Pequeña",
  medium: "Mediana",
  full: "Grande",
};

const STATUS_NAMES: Record<string, string> = {
  pending: "Pendiente",
  running: "En curso",
  completed: "Lista",
  failed: "Falló",
  wiped: "Borrada",
};

const SCENARIO_NAMES: Record<string, string> = {
  "oriente-maya-90d": "Oriente Maya · 90 días de visitas",
};

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
    queryFn: () => infoFn(),
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
    mutationFn: () => executeFn({ data: { scale, seed, confirm_full: confirmFull } }),
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
  const disabled = execute.isPending || (scale === "full" && (!allowFull || !confirmFull));

  const activeRuns = useMemo(
    () => (runs.data?.runs ?? []).filter((r) => r.status !== "wiped"),
    [runs.data],
  );

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <header className="border-b border-border pb-5">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
          Pruebas con visitantes simulados
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Practica con visitantes de prueba
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Crea visitantes de práctica para probar el monitor, capacitar al equipo y revisar
          decisiones sin tocar las cifras reales. Cada prueba queda identificada y se puede borrar.
        </p>
      </header>

      <div className="rounded-lg border-2 border-amber-500 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
        <strong>🧪 Modo de prueba.</strong> Todo lo que se crea aquí queda marcado como prueba y
        separado de las visitas reales. Borrar una prueba sólo elimina sus visitantes simulados; el
        registro de que existió se conserva.
      </div>

      {/* ── Configurador ─────────────────────────────────────────────── */}
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">Preparar una prueba</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Situación simulada:{" "}
          <strong>
            {SCENARIO_NAMES[info.data?.scenario_id ?? "oriente-maya-90d"] ?? info.data?.scenario_id}
          </strong>{" "}
          (versión {info.data?.scenario_version ?? "1.0.0"})
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Tamaño
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
                Código de la prueba
              </label>
              <input
                type="text"
                value={seed}
                onChange={(e) => setSeed(e.target.value)}
                className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                placeholder="p.ej. VMX-DEMO-01"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Con el mismo código y la misma situación, la prueba sale idéntica cada vez.
              </p>
            </div>

            {preview.data && (
              <div className="rounded-md border border-border bg-muted/30 p-3 text-xs">
                <div className="font-semibold text-foreground">Lo que va a crear</div>
                <ul className="mt-1 space-y-0.5 text-muted-foreground">
                  <li>Visitantes: {fmt(preview.data.volume.visitors)}</li>
                  <li>
                    Movimientos (visitas, clics, búsquedas): ≈ {fmt(preview.data.volume.events_low)}{" "}
                    – {fmt(preview.data.volume.events_high)}
                  </li>
                  <li>
                    Espacio que ocupará: ≈ {preview.data.volume.storage_mb_low}–
                    {preview.data.volume.storage_mb_high} MB
                  </li>
                  <li>
                    Fechas simuladas:{" "}
                    {new Date(preview.data.calendar.start_date).toLocaleDateString("es-MX")} →{" "}
                    {new Date(preview.data.calendar.end_date).toLocaleDateString("es-MX")}
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>

        {scale === "full" && (
          <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
            <strong className="text-destructive">Confirmación adicional.</strong>
            <p className="mt-1 text-xs text-muted-foreground">
              La prueba grande (100,000 visitantes) puede crear unos 300,000 movimientos.
              {allowFull
                ? " Marca la casilla para autorizarla."
                : " No está habilitada en este entorno; pídela al equipo técnico."}
            </p>
            <label className="mt-2 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={confirmFull}
                disabled={!allowFull}
                onChange={(e) => setConfirmFull(e.target.checked)}
              />
              Entiendo el tamaño y el costo. Autorizo crear la prueba grande.
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
            {execute.isPending ? "Creando prueba…" : "Crear prueba"}
          </button>
          {execute.isError && (
            <span className="text-xs text-destructive">
              {(execute.error as Error)?.message ?? "No se pudo crear la prueba"}
            </span>
          )}
          {execute.isSuccess && (
            <span className="text-xs text-emerald-600">
              Prueba lista ({execute.data.run_id.slice(0, 8)}…)
            </span>
          )}
        </div>
      </section>

      {/* ── Historial ────────────────────────────────────────────────── */}
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-lg font-semibold">Pruebas realizadas</h2>
            <p className="text-xs text-muted-foreground">
              Cada prueba queda registrada, incluso después de borrarla.
            </p>
          </div>
          <div className="text-xs text-muted-foreground">
            {activeRuns.length} activas · {(runs.data?.runs.length ?? 0) - activeRuns.length}{" "}
            borradas
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="py-2 text-left">Prueba</th>
                <th className="py-2 text-left">Tamaño</th>
                <th className="py-2 text-left">Código</th>
                <th className="py-2 text-left">Estado</th>
                <th className="py-2 text-left">Movimientos</th>
                <th className="py-2 text-left">Inicio</th>
                <th className="py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {(runs.data?.runs ?? []).map((r) => {
                const events = (r.rows_inserted as { events?: number })?.events ?? 0;
                return (
                  <tr key={r.run_id} className="border-b border-border/50">
                    <td className="py-2 font-mono text-xs">{r.run_id.slice(0, 8)}…</td>
                    <td className="py-2">{SCALE_NAMES[r.scale] ?? r.scale}</td>
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
                        {STATUS_NAMES[r.status] ?? r.status}
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
                              Ver sólo la prueba
                            </Link>
                            <Link
                              to="/cms/visitor-intel"
                              search={{ mode: "combined", run: r.run_id }}
                              className="rounded-md border border-border px-2 py-1 text-xs"
                            >
                              Ver con visitas reales
                            </Link>
                            <button
                              type="button"
                              onClick={() => setWipeTarget(r)}
                              className="rounded-md border border-destructive/40 px-2 py-1 text-xs text-destructive"
                            >
                              Borrar
                            </button>
                          </>
                        )}
                        {r.status === "failed" && r.error_message && (
                          <span title={r.error_message} className="text-xs text-destructive">
                            ⚠ falló
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {(runs.data?.runs.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-sm text-muted-foreground">
                    Aún no hay pruebas. Prepara una arriba y créala.
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
            <h3 className="text-lg font-semibold text-destructive">Borrar esta prueba</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Se borrarán todos los visitantes y movimientos simulados de la prueba{" "}
              <code>{wipeTarget.run_id.slice(0, 8)}…</code>. Queda el registro de que existió,
              marcado como <strong>Borrada</strong>. Esto no se puede deshacer.
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
                {(wipe.error as Error)?.message ?? "No se pudo borrar"}
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
                disabled={wipePhrase !== "BORRAR SIMULACION" || wipe.isPending}
                onClick={() => wipe.mutate(wipeTarget.run_id)}
                className="rounded-md bg-destructive px-3 py-2 text-sm font-medium text-destructive-foreground disabled:opacity-50"
              >
                {wipe.isPending ? "Borrando…" : "Borrar prueba"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
