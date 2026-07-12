/**
 * Ola A20 · Panel de calidad de Alux (admin-only).
 *
 * Grafica métricas ya emitidas por el runner:
 *  - riesgo de alucinación promedio + % alto (>0.5)
 *  - tasa de low-context (falta de plan / KB / catálogo)
 *  - latencia promedio y p95
 *  - kb_matches promedio
 *  - desglose por capacidad y por día
 *  - top 15 respuestas de alto riesgo con menciones desconocidas
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAluxQualityStats } from "@/lib/alux/quality.functions";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, AlertTriangle, Gauge, BookOpen, Clock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/cms/alux/calidad")({
  head: () => ({
    meta: [
      { title: "Calidad de Alux · CMS Studio" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AluxQualityPage,
});

const CAP_LABELS: Record<string, string> = {
  suggest_experiences: "Experiencias",
  suggest_restaurants: "Restaurantes",
  suggest_hotels: "Hospedaje",
  improve_trip: "Mejorar viaje",
  detect_gaps: "Huecos del plan",
  draft_concierge_message: "Borrador concierge",
  suggest_from_coupons: "Cupones activos",
  discover_promotions: "Descubrir promos",
  narrate_plan: "Narrar plan",
};

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}
function ms(n: number): string {
  return `${Math.round(n)} ms`;
}

function riskTone(v: number): string {
  if (v >= 0.35) return "text-destructive";
  if (v >= 0.15) return "text-warning";
  return "text-success";
}

function AluxQualityPage() {
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const getFn = useServerFn(getAluxQualityStats);
  const { data, isLoading, error } = useQuery({
    queryKey: ["cms", "alux-quality", days],
    queryFn: () => getFn({ data: { days } }),
  });

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 space-y-8">
      <header className="space-y-2">
        <Link
          to="/cms/alux"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground underline underline-offset-4 hover:text-primary"
        >
          <ArrowLeft className="size-3" aria-hidden /> Volver a la consola
        </Link>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          CMS · Inteligencia
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-serif">Calidad de respuestas de Alux</h1>
          <Badge variant="secondary">Ola A20</Badge>
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Instrumentación heurística (no censura): riesgo de alucinación,
          low-context, latencia y coincidencias con la base de conocimiento
          por capacidad. Complementa el 👍/👎 explícito del viajero.
        </p>

        <div className="pt-2 flex flex-wrap gap-2">
          {[7, 30, 90].map((n) => (
            <button
              key={n}
              onClick={() => setDays(n as 7 | 30 | 90)}
              className={`rounded-full border px-3 py-1 text-xs ${
                days === n
                  ? "bg-primary text-primary-foreground border-primary"
                  : "hover:bg-muted"
              }`}
            >
              Últimos {n} días
            </button>
          ))}
        </div>
      </header>

      {isLoading && (
        <p className="text-sm text-muted-foreground">Cargando métricas…</p>
      )}
      {error && (
        <p className="text-sm text-destructive">
          {(error as Error).message || "No se pudo cargar la calidad."}
        </p>
      )}

      {data && (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              icon={<Gauge className="size-4" />}
              label="Respuestas medidas"
              value={String(data.total)}
              hint={`desde ${new Date(data.since).toLocaleDateString("es-MX")}`}
            />
            <KpiCard
              icon={<AlertTriangle className="size-4" />}
              label="Riesgo alucinación (prom.)"
              value={pct(data.overall.avg_hallucination_risk)}
              tone={riskTone(data.overall.avg_hallucination_risk)}
              hint={`Alto (>50%): ${pct(data.overall.high_hallucination_rate)}`}
            />
            <KpiCard
              icon={<BookOpen className="size-4" />}
              label="Base de conocimiento"
              value={data.overall.avg_kb_matches.toFixed(1)}
              hint={`Low-context: ${pct(data.overall.low_context_rate)}`}
            />
            <KpiCard
              icon={<Clock className="size-4" />}
              label="Latencia"
              value={ms(data.overall.avg_latency_ms)}
              hint={`p95: ${ms(data.overall.p95_latency_ms)}`}
            />
          </section>

          <section className="rounded-2xl border bg-card p-6 shadow-soft">
            <h2 className="font-serif text-lg mb-4">Por capacidad</h2>
            {data.per_capability.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sin respuestas registradas en el rango.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase text-muted-foreground">
                    <tr className="border-b">
                      <th className="text-left py-2 pr-3">Capacidad</th>
                      <th className="text-right py-2 px-3">Total</th>
                      <th className="text-right py-2 px-3">Riesgo prom.</th>
                      <th className="text-right py-2 px-3">% alto</th>
                      <th className="text-right py-2 px-3">Low-ctx</th>
                      <th className="text-right py-2 px-3">KB prom.</th>
                      <th className="text-right py-2 px-3">Sin sources</th>
                      <th className="text-right py-2 pl-3">p95 latencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.per_capability.map((c) => (
                      <tr key={c.capability} className="border-b last:border-0">
                        <td className="py-2 pr-3 font-medium">
                          {CAP_LABELS[c.capability] ?? c.capability}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums">{c.total}</td>
                        <td
                          className={`py-2 px-3 text-right tabular-nums ${riskTone(c.avg_hallucination_risk)}`}
                        >
                          {pct(c.avg_hallucination_risk)}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums">
                          {pct(c.high_hallucination_rate)}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums">
                          {pct(c.low_context_rate)}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums">
                          {c.avg_kb_matches.toFixed(1)}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums">
                          {pct(c.no_sources_rate)}
                        </td>
                        <td className="py-2 pl-3 text-right tabular-nums">
                          {ms(c.p95_latency_ms)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="rounded-2xl border bg-card p-6 shadow-soft">
            <h2 className="font-serif text-lg mb-4">Evolución diaria</h2>
            {data.per_day.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin datos.</p>
            ) : (
              <DailySparkline points={data.per_day} />
            )}
          </section>

          <section className="rounded-2xl border bg-card p-6 shadow-soft">
            <h2 className="font-serif text-lg mb-4">
              Respuestas de alto riesgo (últimas 15)
            </h2>
            {data.recent_high_risk.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Ninguna respuesta reciente superó el umbral heurístico (riesgo &gt; 50%).
              </p>
            ) : (
              <ul className="space-y-3">
                {data.recent_high_risk.map((r) => (
                  <li key={r.id} className="rounded-lg border p-3 space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="destructive">
                        Riesgo {pct(r.hallucination_risk)}
                      </Badge>
                      <span className="font-medium text-foreground">
                        {CAP_LABELS[r.capability] ?? r.capability}
                      </span>
                      <span>·</span>
                      <span>{new Date(r.created_at).toLocaleString("es-MX")}</span>
                      {r.model && (
                        <>
                          <span>·</span>
                          <span className="font-mono">{r.model}</span>
                        </>
                      )}
                      {r.latency_ms != null && (
                        <>
                          <span>·</span>
                          <span>{ms(r.latency_ms)}</span>
                        </>
                      )}
                    </div>
                    {r.unknown_mentions.length > 0 && (
                      <p className="text-sm">
                        <span className="text-muted-foreground">Menciones no verificables: </span>
                        {r.unknown_mentions.map((m, i) => (
                          <span
                            key={i}
                            className="inline-block mr-1 rounded bg-destructive/10 text-destructive px-1.5 py-0.5 text-xs"
                          >
                            {m}
                          </span>
                        ))}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  tone?: string;
}) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-soft">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <p className={`mt-1 text-2xl font-serif tabular-nums ${tone ?? ""}`}>{value}</p>
      {hint && <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

function DailySparkline({
  points,
}: {
  points: Array<{
    day: string;
    total: number;
    avg_hallucination_risk: number;
    low_context_rate: number;
    avg_latency_ms: number;
  }>;
}) {
  const maxTotal = Math.max(1, ...points.map((p) => p.total));
  return (
    <div className="overflow-x-auto">
      <div className="flex items-end gap-1 min-w-full h-40">
        {points.map((p) => {
          const h = Math.max(4, (p.total / maxTotal) * 140);
          const risk = p.avg_hallucination_risk;
          const bg =
            risk >= 0.35
              ? "bg-destructive/70"
              : risk >= 0.15
                ? "bg-warning/70"
                : "bg-primary/70";
          return (
            <div
              key={p.day}
              className="flex flex-col items-center gap-1"
              title={`${p.day} — ${p.total} resp · riesgo ${pct(risk)} · low-ctx ${pct(p.low_context_rate)} · ${ms(p.avg_latency_ms)}`}
            >
              <div className={`w-4 rounded-t ${bg}`} style={{ height: `${h}px` }} />
              <span className="text-[9px] text-muted-foreground rotate-45 origin-top-left translate-y-2">
                {p.day.slice(5)}
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-6 text-[11px] text-muted-foreground">
        Altura = volumen diario · color = riesgo promedio (verde &lt; 15%, ámbar 15–35%, rojo ≥ 35%).
      </p>
    </div>
  );
}