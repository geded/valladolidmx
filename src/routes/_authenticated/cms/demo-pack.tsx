/**
 * /cms/demo-pack — Panel de estado del Demo Pack v1 · Oriente Maya.
 *
 * Read-only. Muestra la cobertura del dataset demo (destinos, empresas,
 * productos, KB multilingüe, reseñas y la orden VMX-DEMO01) y provee
 * accesos rápidos al recorrido demo end-to-end.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, AlertCircle, ExternalLink, PlayCircle, Loader2 } from "lucide-react";
import { getDemoPackStatus } from "@/lib/demo-pack/status.functions";
import {
  listDemoEvaluations,
  runDemoEvaluations,
  type DemoEvaluation,
} from "@/lib/demo-pack/goldenset.functions";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";

export const Route = createFileRoute("/_authenticated/cms/demo-pack")({
  head: () => ({
    meta: [
      { title: "Demo Pack v1 · CMS · Valladolid.mx" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: DemoPackPanel,
});

function DemoPackPanel() {
  const fn = useServerFn(getDemoPackStatus);
  const q = useQuery({
    queryKey: ["cms", "demo-pack", "status"],
    queryFn: () => fn(),
  });

  const listFn = useServerFn(listDemoEvaluations);
  const evals = useQuery({
    queryKey: ["cms", "demo-pack", "goldenset"],
    queryFn: () => listFn(),
  });
  const runFn = useServerFn(runDemoEvaluations);
  const qc = useQueryClient();
  const run = useMutation({
    mutationFn: (id?: string) => runFn({ data: id ? { id } : {} }),
    onSuccess: (r) => {
      const okCount = r.results.filter((x) => x.ok).length;
      toast.success(`Golden Set ejecutado: ${okCount}/${r.ran} aprobadas`);
      qc.invalidateQueries({ queryKey: ["cms", "demo-pack", "goldenset"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falló la ejecución"),
  });

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8">
      <header className="border-b border-border pb-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
          Demo World · Oriente Maya
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Demo Pack v1
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Estado del ecosistema navegable oficial del Oriente Maya. Cada elemento
          debe ser descubrible, recomendable por Alux y vendible.
        </p>
      </header>

      {q.isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando cobertura…</p>
      ) : q.error ? (
        <p className="text-sm text-destructive">
          No se pudo cargar el estado del Demo Pack.
        </p>
      ) : q.data ? (
        <>
          <section
            className={
              "rounded-2xl border p-5 " +
              (q.data.overallOk
                ? "border-success/40 bg-success/5"
                : "border-warning/40 bg-warning/5")
            }
          >
            <div className="flex items-center gap-3">
              {q.data.overallOk ? (
                <CheckCircle2 className="h-5 w-5 text-success" />
              ) : (
                <AlertCircle className="h-5 w-5 text-warning" />
              )}
              <div>
                <p className="text-sm font-semibold">
                  {q.data.overallOk
                    ? "Demo Pack completo y listo para demostrar el recorrido."
                    : "Faltan piezas para completar el Demo Pack."}
                </p>
                <p className="text-xs text-muted-foreground">
                  Generado {new Date(q.data.generatedAt).toLocaleString("es-MX")}
                </p>
              </div>
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-2">
            {q.data.sections.map((s) => (
              <div
                key={s.key}
                className="flex items-center justify-between rounded-2xl border border-border bg-card p-4"
              >
                <div>
                  <p className="text-sm font-medium">{s.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.count} / meta {s.target}
                  </p>
                </div>
                {s.ok ? (
                  <CheckCircle2 className="h-5 w-5 text-success" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-warning" />
                )}
              </div>
            ))}
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Recorrido demo end-to-end
            </p>
            <h2 className="mt-2 text-lg font-semibold">
              Viajero: Armando G. · Orden {q.data.demoOrderFolio}
            </h2>
            <ul className="mt-4 space-y-2 text-sm">
              <DemoLink to="/oriente-maya" label="Descubrimiento · Oriente Maya" />
              <DemoLink to="/hoteles" label="Hoteles demo (Suite Selva Maya)" />
              <DemoLink to="/casas-de-vacaciones" label="Casas de vacaciones demo" />
              <DemoLink to="/experiencias" label="Experiencias demo (Manglar al amanecer)" />
              <DemoLink to="/cms/travel-plans" label="Panel Concierge · Travel Plans" />
              <DemoLink to="/cms/ventas-en-linea" label="Comisiones · Ventas en línea" />
              <DemoLink to="/cms/alux/calidad" label="Alux · Calidad heurística" />
            </ul>
            <p className="mt-4 text-xs text-muted-foreground">
              Login demo: <code className="rounded bg-muted px-1.5 py-0.5">geded@valladolid.com.mx</code>
            </p>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Validación · Golden Set
                </p>
                <h2 className="mt-2 text-lg font-semibold">
                  Alux recall del recorrido demo
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Preguntas modelo del viajero: cada elemento debe ser descubrible,
                  recomendable por Alux y sin alucinaciones.
                </p>
              </div>
              <Button
                onClick={() => run.mutate(undefined)}
                disabled={run.isPending}
                size="sm"
              >
                {run.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <PlayCircle className="mr-2 h-4 w-4" />
                )}
                Ejecutar todo
              </Button>
            </div>

            <ul className="mt-5 space-y-3">
              {(evals.data ?? []).map((ev) => (
                <GoldenRow
                  key={ev.id}
                  ev={ev}
                  running={run.isPending}
                  onRun={() => run.mutate(ev.id)}
                />
              ))}
              {evals.isLoading ? (
                <li className="text-sm text-muted-foreground">Cargando preguntas…</li>
              ) : null}
            </ul>
          </section>
        </>
      ) : null}
    </div>
  );
}

function GoldenRow({
  ev,
  running,
  onRun,
}: {
  ev: DemoEvaluation;
  running: boolean;
  onRun: () => void;
}) {
  const scorePct =
    ev.last_score != null ? Math.round(ev.last_score * 100) : null;
  const riskPct =
    ev.last_hallucination_risk != null
      ? Math.round(ev.last_hallucination_risk * 100)
      : null;
  return (
    <li className="rounded-xl border border-border/70 bg-background p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {ev.locale}
            </span>
            {ev.last_ok === true ? (
              <CheckCircle2 className="h-4 w-4 text-success" />
            ) : ev.last_ok === false ? (
              <AlertCircle className="h-4 w-4 text-warning" />
            ) : null}
          </div>
          <p className="mt-1 text-sm font-medium">{ev.question}</p>
          {ev.last_run_at ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Score {scorePct}% · Riesgo alucinación {riskPct}% ·{" "}
              {ev.last_latency_ms}ms ·{" "}
              {new Date(ev.last_run_at).toLocaleString("es-MX")}
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">Sin ejecutar</p>
          )}
          {ev.last_missing_entities.length ? (
            <p className="mt-1 text-xs text-warning">
              Falta mencionar: {ev.last_missing_entities.join(", ")}
            </p>
          ) : null}
          {ev.last_answer ? (
            <details className="mt-2 text-xs">
              <summary className="cursor-pointer text-muted-foreground">
                Ver respuesta
              </summary>
              <pre className="mt-2 whitespace-pre-wrap rounded bg-muted p-3 text-[11px] leading-relaxed">
                {ev.last_answer}
              </pre>
            </details>
          ) : null}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRun}
          disabled={running}
          className="shrink-0"
        >
          <PlayCircle className="h-4 w-4" />
        </Button>
      </div>
    </li>
  );
}

function DemoLink({ to, label }: { to: string; label: string }) {
  return (
    <li>
      <Link
        to={to}
        className="inline-flex items-center gap-2 text-primary hover:underline"
      >
        <ExternalLink className="h-3.5 w-3.5" />
        {label}
      </Link>
    </li>
  );
}