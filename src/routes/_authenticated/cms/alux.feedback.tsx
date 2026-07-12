/**
 * Ola A4 · Panel admin de Feedback de Alux
 *
 * KPIs de calidad: CSAT global, volumen 👍/👎 por día, desglose por
 * capacidad, top de entradas de la Base de Conocimiento citadas en
 * respuestas mal calificadas (loop de curación) y feedback reciente
 * literal (motivo + extracto).
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAluxFeedbackStats } from "@/lib/alux/feedback.functions";
import { Badge } from "@/components/ui/badge";
import { ThumbsUp, ThumbsDown, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/cms/alux/feedback")({
  head: () => ({
    meta: [
      { title: "Feedback de Alux · CMS Studio" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AluxFeedbackPage,
});

const CAPABILITY_LABELS: Record<string, string> = {
  suggest_experiences: "Experiencias",
  suggest_restaurants: "Restaurantes",
  suggest_hotels: "Hospedaje",
  improve_trip: "Mejorar viaje",
  detect_gaps: "Huecos del plan",
  draft_concierge_message: "Borrador concierge",
  suggest_from_coupons: "Cupones activos",
  discover_promotions: "Descubrir promos",
};

function capLabel(k: string): string {
  return CAPABILITY_LABELS[k] ?? k;
}

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

function AluxFeedbackPage() {
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const getFn = useServerFn(getAluxFeedbackStats);
  const { data, isLoading, error } = useQuery({
    queryKey: ["cms", "alux-feedback", days],
    queryFn: () => getFn({ data: { days } }),
  });

  return (
    <div className="mx-auto max-w-5xl px-6 py-8 space-y-8">
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
          <h1 className="text-2xl font-serif">Feedback y calidad de Alux</h1>
          <Badge variant="secondary">Ola A4</Badge>
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Cada 👍/👎 del viajero se registra aquí. Úsalo para iterar el
          prompt, curar la Base de Conocimiento (Ola A2) y detectar
          capacidades con baja calidad.
        </p>

        <div className="pt-2 flex flex-wrap gap-2">
          {[7, 30, 90].map((n) => (
            <button
              key={n}
              onClick={() => setDays(n as 7 | 30 | 90)}
              className={`rounded-full border px-3 py-1 text-xs transition ${
                days === n
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:border-primary/40"
              }`}
            >
              Últimos {n} días
            </button>
          ))}
        </div>
      </header>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando estadísticas…</p>
      ) : error ? (
        <p className="text-sm text-destructive">
          {(error as Error).message || "No se pudo cargar"}
        </p>
      ) : !data ? null : (
        <>
          {/* KPIs globales */}
          <section className="grid gap-4 sm:grid-cols-4">
            <KpiCard label="CSAT" value={data.totals.total > 0 ? pct(data.totals.csat) : "—"} hint={`${data.totals.total} respuestas`} />
            <KpiCard label="👍 Útiles" value={String(data.totals.up)} tone="success" />
            <KpiCard label="👎 Poco útiles" value={String(data.totals.down)} tone="destructive" />
            <KpiCard
              label="Volumen total"
              value={String(data.totals.total)}
              hint={`ventana ${days}d`}
            />
          </section>

          {/* Por capacidad */}
          <section className="rounded-2xl border bg-card p-6 shadow-soft">
            <h2 className="font-serif text-lg mb-4">CSAT por capacidad</h2>
            {data.perCapability.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aún sin feedback en esta ventana.
              </p>
            ) : (
              <div className="space-y-3">
                {data.perCapability.map((c) => (
                  <div key={c.capability} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{capLabel(c.capability)}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {pct(c.csat)} · {c.up}👍 / {c.down}👎 · {c.total} total
                      </span>
                    </div>
                    <div className="flex h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="bg-success"
                        style={{ width: `${(c.up / Math.max(c.total, 1)) * 100}%` }}
                      />
                      <div
                        className="bg-destructive"
                        style={{ width: `${(c.down / Math.max(c.total, 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Volumen por día */}
          <section className="rounded-2xl border bg-card p-6 shadow-soft">
            <h2 className="font-serif text-lg mb-4">Volumen diario</h2>
            {data.perDay.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin datos.</p>
            ) : (
              <div className="flex items-end gap-1 h-32">
                {data.perDay.map((d) => {
                  const total = d.up + d.down;
                  const max = Math.max(
                    ...data.perDay.map((x) => x.up + x.down),
                    1,
                  );
                  const h = (total / max) * 100;
                  const upH = total > 0 ? (d.up / total) * h : 0;
                  const downH = total > 0 ? (d.down / total) * h : 0;
                  return (
                    <div
                      key={d.day}
                      className="flex-1 flex flex-col-reverse gap-px min-w-[6px]"
                      title={`${d.day} · ${d.up}👍 / ${d.down}👎`}
                    >
                      <div
                        className="bg-success rounded-sm"
                        style={{ height: `${upH}%` }}
                      />
                      <div
                        className="bg-destructive rounded-sm"
                        style={{ height: `${downH}%` }}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Top KB en respuestas mal calificadas */}
          <section className="rounded-2xl border bg-card p-6 shadow-soft">
            <h2 className="font-serif text-lg mb-1">
              Entradas de conocimiento a revisar
            </h2>
            <p className="mb-4 text-xs text-muted-foreground">
              Base de Conocimiento (Ola A2) citada en respuestas con 👎.
              Revísalas o mejóralas.
            </p>
            {data.knowledgeDownHits.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Ninguna entrada asociada a feedback negativo. 🎉
              </p>
            ) : (
              <ul className="space-y-1.5">
                {data.knowledgeDownHits.map((k) => (
                  <li
                    key={k.knowledge_id}
                    className="flex items-center justify-between rounded-lg border px-3 py-2 text-xs"
                  >
                    <code className="text-muted-foreground truncate max-w-[70%]">
                      {k.knowledge_id}
                    </code>
                    <span className="tabular-nums">
                      {k.hits} 👎
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3">
              <Link
                to="/cms/alux/conocimiento"
                className="text-xs underline underline-offset-4 hover:text-primary"
              >
                Abrir Base de Conocimiento →
              </Link>
            </div>
          </section>

          {/* Feedback reciente */}
          <section className="rounded-2xl border bg-card p-6 shadow-soft">
            <h2 className="font-serif text-lg mb-4">Feedback reciente</h2>
            {data.recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin registros.</p>
            ) : (
              <ul className="divide-y">
                {data.recent.map((r) => (
                  <li key={r.id} className="py-3 space-y-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {r.rating === 1 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-success">
                          <ThumbsUp className="size-3" aria-hidden /> útil
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-destructive">
                          <ThumbsDown className="size-3" aria-hidden /> poco útil
                        </span>
                      )}
                      <span>{capLabel(r.capability)}</span>
                      <span className="ml-auto">
                        {new Date(r.created_at).toLocaleString("es-MX")}
                      </span>
                    </div>
                    {r.reason ? (
                      <p className="text-sm">
                        <span className="font-medium text-muted-foreground">Motivo: </span>
                        {r.reason}
                      </p>
                    ) : null}
                    {r.suggestion_excerpt ? (
                      <p className="text-xs text-muted-foreground line-clamp-2 italic">
                        “{r.suggestion_excerpt}”
                      </p>
                    ) : null}
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
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "success" | "destructive";
}) {
  const toneClass =
    tone === "success"
      ? "text-success"
      : tone === "destructive"
        ? "text-destructive"
        : "text-foreground";
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-soft">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className={`mt-1 text-2xl font-serif tabular-nums ${toneClass}`}>
        {value}
      </p>
      {hint ? (
        <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}