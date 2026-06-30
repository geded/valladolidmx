/**
 * /cms/alertas — Ola 4 · Etapa 7
 *
 * Panel administrativo de alertas técnicas y funcionales. Listado,
 * acuse y resolución; evaluador on-demand para umbrales funcionales.
 */
import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  listSystemAlerts,
  acknowledgeSystemAlert,
  resolveSystemAlert,
  evaluateFunctionalAlerts,
  type SystemAlert,
} from "@/lib/observability/observability.functions";

export const Route = createFileRoute("/_authenticated/cms/alertas")({
  head: () => ({
    meta: [
      { title: "Alertas · CMS Studio · Valladolid.mx" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AlertsPage,
});

const STATUS_OPTIONS = [
  { value: "open", label: "Abiertas" },
  { value: "acknowledged", label: "Reconocidas" },
  { value: "resolved", label: "Resueltas" },
  { value: "all", label: "Todas" },
] as const;

const SEV_BADGE: Record<SystemAlert["severity"], string> = {
  critical: "bg-destructive/10 text-destructive border-destructive/30",
  warning: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
  info: "bg-primary/10 text-primary border-primary/30",
};

function AlertsPage() {
  const fnList = useServerFn(listSystemAlerts);
  const fnAck = useServerFn(acknowledgeSystemAlert);
  const fnRes = useServerFn(resolveSystemAlert);
  const fnEval = useServerFn(evaluateFunctionalAlerts);

  const [status, setStatus] = useState<(typeof STATUS_OPTIONS)[number]["value"]>(
    "open",
  );
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [evalResult, setEvalResult] = useState<string | null>(null);

  const load = useCallback(() => {
    setBusy(true);
    fnList({ data: { status } })
      .then((rows) => {
        setAlerts(rows);
        setError(null);
      })
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : String(e)),
      )
      .finally(() => setBusy(false));
  }, [fnList, status]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8">
      <header className="border-b border-border pb-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
          Fase 2 · Ola 4 · Etapa 7
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Alertas</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Alertas técnicas y funcionales agregadas en{" "}
          <code className="rounded bg-muted px-1.5 py-0.5">system_alerts</code>.
          Cada alerta es idempotente por <em>kind</em> mientras esté abierta.
        </p>
      </header>

      <section className="flex flex-wrap items-center gap-3 text-xs">
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => setStatus(s.value)}
            className={[
              "rounded-full border px-3 py-1",
              status === s.value
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:bg-accent",
            ].join(" ")}
          >
            {s.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setEvalResult(null);
              fnEval({ data: { windowMinutes: 60 } })
                .then((r) =>
                  setEvalResult(
                    `Evaluación: ${r.alerts_raised} alertas emitidas (ventana 60 min).`,
                  ),
                )
                .then(load)
                .catch((e: unknown) =>
                  setError(e instanceof Error ? e.message : String(e)),
                );
            }}
            className="rounded-md border border-border bg-card px-3 py-1.5 font-medium hover:bg-accent"
          >
            Evaluar umbrales (1h)
          </button>
          <button
            type="button"
            onClick={load}
            className="rounded-md border border-border bg-card px-3 py-1.5 font-medium hover:bg-accent"
          >
            Refrescar
          </button>
        </div>
      </section>

      {evalResult && (
        <p className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-primary">
          {evalResult}
        </p>
      )}
      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      )}

      <section className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Severidad</th>
              <th className="px-3 py-2">Tipo</th>
              <th className="px-3 py-2">Mensaje</th>
              <th className="px-3 py-2 text-right">Ocurrencias</th>
              <th className="px-3 py-2">Última</th>
              <th className="px-3 py-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {!busy && alerts.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                  Sin alertas en este estado.
                </td>
              </tr>
            )}
            {alerts.map((a) => (
              <tr key={a.id} className="border-t border-border align-top">
                <td className="px-3 py-2">
                  <span
                    className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${SEV_BADGE[a.severity]}`}
                  >
                    {a.severity}
                  </span>
                </td>
                <td className="px-3 py-2 font-mono text-xs">{a.kind}</td>
                <td className="px-3 py-2">
                  <p>{a.message}</p>
                  <pre className="mt-1 overflow-x-auto rounded bg-muted/40 p-2 text-[10px] text-muted-foreground">
                    {a.payload}
                  </pre>
                </td>
                <td className="px-3 py-2 text-right font-mono">{a.occurrences}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {new Date(a.last_seen_at).toLocaleString()}
                </td>
                <td className="px-3 py-2 text-right">
                  <div className="inline-flex gap-1">
                    {a.status === "open" && (
                      <button
                        type="button"
                        onClick={() =>
                          fnAck({ data: { id: a.id } }).then(load).catch((e: unknown) =>
                            setError(e instanceof Error ? e.message : String(e)),
                          )
                        }
                        className="rounded-md border border-border bg-card px-2 py-1 text-xs hover:bg-accent"
                      >
                        Reconocer
                      </button>
                    )}
                    {a.status !== "resolved" && (
                      <button
                        type="button"
                        onClick={() =>
                          fnRes({ data: { id: a.id } }).then(load).catch((e: unknown) =>
                            setError(e instanceof Error ? e.message : String(e)),
                          )
                        }
                        className="rounded-md border border-border bg-card px-2 py-1 text-xs hover:bg-accent"
                      >
                        Resolver
                      </button>
                    )}
                    {a.status === "resolved" && (
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        cerrada
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
