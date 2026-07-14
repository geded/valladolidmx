/**
 * CV8.3 · Visitor Intelligence Center — Console v1.0
 *
 * Superficie ejecutiva compuesta por Decision Cards. Cada tarjeta
 * responde 3 preguntas: qué ocurre, por qué y qué decisión permite.
 * Reutiliza KPI_CATALOG (CV8.0) y `aggregateJourneyIntel` (CV8.3).
 */
import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import {
  aggregateJourneyIntel,
  type JourneyIntelSnapshot,
} from "@/lib/visitor-intel/intel-aggregate.functions";
import {
  aggregateJourneySegments,
  MIN_SEGMENT_POPULATION,
  type JourneySegmentSnapshot,
  type SegmentDimension,
} from "@/lib/visitor-intel/segments.functions";
import {
  detectJourneyOpportunities,
  MIN_SAMPLE_FOR_OPPORTUNITY,
  type Opportunity,
  type OpportunitySeverity,
  type OpportunitySnapshot,
} from "@/lib/visitor-intel/opportunities.functions";
import {
  aggregateRecommendationValidation,
  MIN_FAMILY_SIGNAL,
  type FamilyLearningSignal,
  type RecommendationRecord,
  type RecommendationValidationSnapshot,
} from "@/lib/visitor-intel/recommendations.functions";
import {
  prioritizeOpportunities,
  PRIORITIZATION_WEIGHTS,
  type PrioritizedOpportunity,
} from "@/lib/visitor-intel/prioritization";
import {
  prioritizeSegments,
  SEGMENT_PRIORITIZATION_WEIGHTS,
  type SegmentFinding,
  type SegmentFindingType,
} from "@/lib/visitor-intel/segment-prioritization";
import {
  KPI_CATALOG,
  JOURNEY_TRANSITIONS,
  type JourneyTransitionId,
} from "@/lib/visitor-intel";

export const Route = createFileRoute("/_authenticated/cms/visitor-intel")({
  head: () => ({
    meta: [
      { title: "Visitor Intelligence Center · CMS · Valladolid.mx" },
      {
        name: "description",
        content:
          "Centro de Inteligencia del Visitante — cada módulo responde una pregunta de negocio y declara la decisión que permite tomar.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: VisitorIntelCenter,
});

type Windw = 7 | 30 | 90;

function VisitorIntelCenter() {
  const [win, setWin] = useState<Windw>(30);
  const call = useServerFn(aggregateJourneyIntel);
  const q = useQuery({
    queryKey: ["cms", "visitor-intel", win],
    queryFn: () => call({ data: { window_days: win } }),
    staleTime: 60_000,
  });

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <header className="border-b border-border pb-5">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
          CV8.3 · Centro de Inteligencia
        </p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Visitor Intelligence Center
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Cada módulo responde una pregunta de negocio y declara la
              decisión que permite tomar. No es un dashboard — es un Centro
              de Decisiones. Ventana:{" "}
              <strong>{win} días</strong>.
            </p>
          </div>
          <div className="flex gap-1 rounded-full border border-border p-1 text-xs">
            {[7, 30, 90].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setWin(n as Windw)}
                className={
                  "rounded-full px-3 py-1 " +
                  (win === n
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground")
                }
              >
                {n}d
              </button>
            ))}
          </div>
        </div>
      </header>

      {q.error ? (
        <p className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          No fue posible cargar la inteligencia. Verifica tu rol admin/super_admin.
        </p>
      ) : null}

      <IntelModules snapshot={q.data} loading={q.isLoading} />
      <SegmentationSection window={win} />
      <OpportunitySection window={win} />
      <PrioritizationSection window={win} />
      <SegmentPrioritizationSection window={win} />
      <ValidationLoopSection />
    </div>
  );
}

/* --------------------------------------------------------------------- */
/* CV8.4 · Segmentación                                                  */
/* --------------------------------------------------------------------- */

const DIMENSIONS: Array<{ id: SegmentDimension; label: string; hint: string }> = [
  { id: "locale", label: "Idioma", hint: "subject.locale" },
  { id: "destination", label: "Destino", hint: "context.destination_id" },
  { id: "capability", label: "Capability", hint: "context.surface (prefijo)" },
  { id: "country", label: "País", hint: "requiere ampliar contrato" },
  { id: "channel", label: "Canal", hint: "requiere ampliar contrato" },
  { id: "device", label: "Dispositivo", hint: "requiere ampliar contrato" },
];

function SegmentationSection({ window: win }: { window: 7 | 30 | 90 }) {
  const [dim, setDim] = useState<SegmentDimension>("locale");
  const call = useServerFn(aggregateJourneySegments);
  const q = useQuery({
    queryKey: ["cms", "visitor-intel", "segments", dim, win],
    queryFn: () => call({ data: { dimension: dim, window_days: win } }),
    staleTime: 60_000,
  });

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-surface p-5">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-border/60 pb-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
            CV8.4 · Segmentación
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight">
            ¿Cómo recorre el Journey cada grupo?
          </h2>
          <p className="mt-1 max-w-2xl text-xs text-muted-foreground">
            Segmentación ética: sólo datos mínimos, agregados, con umbral
            mínimo de <strong>{MIN_SEGMENT_POPULATION}</strong> sujetos.
            Segmentos menores se agrupan como <em>Otros</em>. Cero
            identidades individuales.
          </p>
        </div>
        <div className="flex flex-wrap gap-1 rounded-full border border-border p-1 text-xs">
          {DIMENSIONS.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setDim(d.id)}
              className={
                "rounded-full px-3 py-1 " +
                (dim === d.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground")
              }
              title={d.hint}
            >
              {d.label}
            </button>
          ))}
        </div>
      </header>

      <SegmentationBody snapshot={q.data} loading={q.isLoading} error={!!q.error} />
    </section>
  );
}

function SegmentationBody({
  snapshot,
  loading,
  error,
}: {
  snapshot: JourneySegmentSnapshot | undefined;
  loading: boolean;
  error: boolean;
}) {
  if (error) {
    return (
      <p className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
        No fue posible cargar la segmentación.
      </p>
    );
  }
  if (loading || !snapshot) {
    return <p className="h-6 w-32 animate-pulse rounded bg-muted" />;
  }

  if (snapshot.status === "contract_pending") {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface-raised p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">
          Segmentación pendiente de contrato
        </p>
        <p className="mt-1">{snapshot.pending_reason}</p>
      </div>
    );
  }

  if (snapshot.status === "empty" || snapshot.buckets.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface-raised p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">
          Sin muestra suficiente en la ventana seleccionada
        </p>
        <p className="mt-1">
          Baseline: <strong>{snapshot.baseline.active_subjects}</strong> sujetos ·
          JPR {(snapshot.baseline.jpr * 100).toFixed(1)}%. Se activará cuando
          existan segmentos con ≥ {snapshot.min_population} sujetos activos.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Baseline global · <strong>{snapshot.baseline.active_subjects}</strong>{" "}
        sujetos · JPR{" "}
        <strong>{(snapshot.baseline.jpr * 100).toFixed(1)}%</strong>. Delta ={" "}
        JPR del segmento − baseline.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="py-2">Segmento</th>
              <th>Activos</th>
              <th>Avanzaron</th>
              <th>JPR</th>
              <th>Δ vs baseline</th>
              <th>Intención</th>
              <th>T2</th>
              <th>T5</th>
              <th>T7</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.buckets.map((b) => (
              <SegmentRow key={b.key} b={b} />
            ))}
            {snapshot.others ? <SegmentRow b={snapshot.others} /> : null}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Contrato v{snapshot.contract_version} · dimensión{" "}
        <code>{snapshot.dimension}</code> · recomputado sin persistencia.
      </p>
    </div>
  );
}

function SegmentRow({
  b,
}: {
  b: JourneySegmentSnapshot["buckets"][number];
}) {
  const delta = b.jpr_delta_vs_baseline;
  const deltaColor =
    delta > 0.02 ? "text-success" : delta < -0.02 ? "text-destructive" : "text-muted-foreground";
  return (
    <tr className="border-t border-border/60">
      <td className="py-2 font-medium">
        {b.label}
        {b.suppressed ? (
          <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
            agregado
          </span>
        ) : null}
      </td>
      <td className="font-mono">{b.active_subjects}</td>
      <td className="font-mono">{b.progressed_subjects}</td>
      <td className="font-mono">{(b.jpr * 100).toFixed(1)}%</td>
      <td className={"font-mono " + deltaColor}>
        {delta > 0 ? "+" : ""}
        {(delta * 100).toFixed(1)} pp
      </td>
      <td className="font-mono">{b.intent_signals}</td>
      <td className="font-mono">{b.transitions.T2_anonymous_to_identified}</td>
      <td className="font-mono">{b.transitions.T5_interested_to_travel_plan}</td>
      <td className="font-mono">{b.transitions.T7_concierge_to_reservation}</td>
    </tr>
  );
}

/* --------------------------------------------------------------------- */

function IntelModules({
  snapshot,
  loading,
}: {
  snapshot: JourneyIntelSnapshot | undefined;
  loading: boolean;
}) {
  const kpi = useMemo(
    () => Object.fromEntries(KPI_CATALOG.map((k) => [k.id, k])),
    [],
  );

  const t = (id: JourneyTransitionId) =>
    snapshot?.transitions.find((x) => x.id === id);

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <DecisionCard
        title="Journey Funnel"
        question="¿Dónde se está fugando el viajero en el Journey?"
        why="Compara conteos de cada transición canónica T1..T9."
        decision={kpi["JPR_30D"]?.actionable_decision ?? ""}
        value={
          snapshot
            ? `${snapshot.progressed_subjects} / ${snapshot.active_subjects} avanzaron`
            : undefined
        }
        detail={
          snapshot ? (
            <ul className="mt-3 space-y-1 text-xs">
              {snapshot.transitions.map((row) => (
                <li
                  key={row.id}
                  className="flex items-center justify-between border-b border-border/60 py-1"
                >
                  <span className="text-muted-foreground">
                    {row.id.replace(/^T(\d).*/, "T$1")} ·{" "}
                    {JOURNEY_TRANSITIONS[row.id].from} →{" "}
                    {JOURNEY_TRANSITIONS[row.id].to}
                  </span>
                  <span className="font-mono">
                    {row.distinct_subjects}
                  </span>
                </li>
              ))}
            </ul>
          ) : null
        }
        activatesWhen="lleguen eventos journey.transition (CV8.1)."
        loading={loading}
      />

      <DecisionCard
        title="Conversión del Journey (JPR)"
        question="¿Qué % avanza ≥1 etapa en la ventana?"
        why="Journey Progression Rate — North Star."
        decision={kpi["JPR_30D"]?.actionable_decision ?? ""}
        value={snapshot ? `${(snapshot.jpr * 100).toFixed(1)} %` : undefined}
        activatesWhen="haya ≥1 subject activo con eventos."
        loading={loading}
      />

      <DecisionCard
        title="Visitantes Anónimos → Identificados"
        question="¿Cuántos anónimos se registran?"
        why="Transición T2 · momentos de valor (AC1.4)."
        decision={kpi["T2_conversion"]?.actionable_decision ?? ""}
        value={
          snapshot
            ? `${t("T2_anonymous_to_identified")?.distinct_subjects ?? 0} personas`
            : undefined
        }
        activatesWhen="lleguen transiciones T2."
        loading={loading}
      />

      <DecisionCard
        title="Travel Plans creados"
        question="¿Cuántos planes reales se están creando?"
        why="Transición T5 · Bridge Alux↔Plan."
        decision={kpi["T5_conversion"]?.actionable_decision ?? ""}
        value={
          snapshot
            ? `${t("T5_interested_to_travel_plan")?.distinct_subjects ?? 0} viajeros`
            : undefined
        }
        activatesWhen="Travel Plan emita journey.transition T5."
        loading={loading}
      />

      <DecisionCard
        title="Alux · Intención capturada"
        question="¿Qué volumen de señales de intención genera Alux/Discovery?"
        why="Suma de intent.signal en la ventana."
        decision="Repriorizar surfaces/recomendaciones con menor generación de intención."
        value={
          snapshot ? `${snapshot.intent_signals_total} señales` : undefined
        }
        activatesWhen="las superficies emitan intent.signal."
        loading={loading}
      />

      <DecisionCard
        title="Concierge · Promoción a caso"
        question="¿Cuántos planes se promueven a Concierge?"
        why="Transición T6 · propuesta Alux."
        decision={kpi["T6_conversion"]?.actionable_decision ?? ""}
        value={
          snapshot
            ? `${t("T6_travel_plan_to_concierge")?.distinct_subjects ?? 0} casos`
            : undefined
        }
        activatesWhen="lleguen transiciones T6."
        loading={loading}
      />

      <DecisionCard
        title="Revenue · Concierge → Reserva"
        question="¿Cuánto está convirtiendo el Concierge en reservas?"
        why="Transición T7 · checkout narrativo."
        decision={kpi["T7_conversion"]?.actionable_decision ?? ""}
        value={
          snapshot
            ? `${t("T7_concierge_to_reservation")?.distinct_subjects ?? 0} reservas`
            : undefined
        }
        activatesWhen="Concierge emita transición T7."
        loading={loading}
      />

      <DecisionCard
        title="Empresas · Intención por capacidad"
        question="¿Qué empresas generan más intención?"
        why="Requiere segmentación por capability (CV8.4)."
        decision="Priorizar publicación / spotlight en empresas de alta intención y baja conversión."
        activatesWhen="CV8.4 habilite segmentación por capability."
        loading={loading}
      />

      <DecisionCard
        title="Destinos · Avance de Journey"
        question="¿Qué destinos generan más avance del Journey?"
        why="Requiere segmentación por destination_id (CV8.4)."
        decision="Reasignar recursos editoriales hacia destinos con mejor progresión."
        activatesWhen="CV8.4 habilite segmentación por destino."
        loading={loading}
      />

      <DecisionCard
        title="Permanencia · Continuity Rate"
        question="¿Los viajeros regresan y reconocen su viaje?"
        why="Contrapeso oficial CONTINUITY_RATE."
        decision={kpi["CONTINUITY_RATE"]?.actionable_decision ?? ""}
        activatesWhen="lleguen señales continuity.recognized (post CV8.3)."
        loading={loading}
      />

      <DecisionCard
        title="Embajadores"
        question="¿Cuántos viajeros regresan como advocates?"
        why="Transición T9 · post-trip loops."
        decision={kpi["T9_conversion"]?.actionable_decision ?? ""}
        value={
          snapshot
            ? `${t("T9_traveler_to_ambassador")?.distinct_subjects ?? 0} embajadores`
            : undefined
        }
        activatesWhen="lleguen transiciones T9."
        loading={loading}
      />

      <DecisionCard
        title="Alertas de conversión"
        question="¿Hay transiciones cayendo bajo benchmark?"
        why="Requiere motor de umbrales (CV8.5)."
        decision="Intervención inmediata en la transición degradada."
        activatesWhen="CV8.5 defina benchmarks y umbrales."
        loading={loading}
      />
    </section>
  );
}

/* --------------------------------------------------------------------- */

function DecisionCard({
  title,
  question,
  why,
  decision,
  value,
  detail,
  activatesWhen,
  loading,
}: {
  title: string;
  question: string;
  why: string;
  decision: string;
  value?: string;
  detail?: React.ReactNode;
  activatesWhen: string;
  loading: boolean;
}) {
  const hasData = value !== undefined;
  return (
    <article className="flex flex-col rounded-2xl border border-border bg-surface p-5">
      <header className="flex items-start justify-between gap-3">
        <h2 className="text-base font-semibold leading-snug">{title}</h2>
        <span
          className={
            "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide " +
            (hasData
              ? "bg-success/15 text-success"
              : "bg-muted text-muted-foreground")
          }
        >
          {hasData ? "Accionable" : "Pendiente"}
        </span>
      </header>

      <p className="mt-2 text-xs text-muted-foreground">
        <strong className="text-foreground">Pregunta:</strong> {question}
      </p>

      {loading ? (
        <p className="mt-3 h-6 w-24 animate-pulse rounded bg-muted" />
      ) : hasData ? (
        <p className="mt-3 font-display text-2xl">{value}</p>
      ) : (
        <p className="mt-3 rounded-lg border border-dashed border-border bg-surface-raised p-3 text-xs text-muted-foreground">
          Se activará cuando {activatesWhen}
        </p>
      )}

      {detail}

      <div className="mt-4 space-y-1 border-t border-border/60 pt-3 text-xs">
        <p>
          <strong>Por qué:</strong>{" "}
          <span className="text-muted-foreground">{why}</span>
        </p>
        <p>
          <strong>Decisión:</strong>{" "}
          <span className="text-muted-foreground">{decision}</span>
        </p>
      </div>
    </article>
  );
}
/* --------------------------------------------------------------------- */
/* CV8.5 · Benchmarks & Opportunity Intelligence                         */
/* --------------------------------------------------------------------- */

const SEVERITY_STYLE: Record<
  OpportunitySeverity,
  { label: string; badge: string; ring: string }
> = {
  critical: {
    label: "Crítica",
    badge: "bg-destructive/15 text-destructive",
    ring: "border-destructive/40",
  },
  attention: {
    label: "Atención",
    badge: "bg-warning/15 text-warning",
    ring: "border-warning/40",
  },
  opportunity: {
    label: "Oportunidad",
    badge: "bg-success/15 text-success",
    ring: "border-success/40",
  },
  informative: {
    label: "Informativa",
    badge: "bg-muted text-muted-foreground",
    ring: "border-border",
  },
};

function OpportunitySection({ window: win }: { window: 7 | 30 | 90 }) {
  const call = useServerFn(detectJourneyOpportunities);
  const q = useQuery({
    queryKey: ["cms", "visitor-intel", "opportunities", win],
    queryFn: () => call({ data: { window_days: win } }),
    staleTime: 60_000,
  });

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-surface p-5">
      <header className="border-b border-border/60 pb-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
          CV8.5 · Benchmarks & Oportunidades
        </p>
        <h2 className="mt-1 text-xl font-semibold tracking-tight">
          ¿Qué acción concreta recomendamos ahora?
        </h2>
        <p className="mt-1 max-w-2xl text-xs text-muted-foreground">
          Detección automática de oportunidades: cada hallazgo compara la
          ventana actual contra el periodo anterior y declara evidencia,
          confianza y acción sugerida. Muestra mínima:{" "}
          <strong>{MIN_SAMPLE_FOR_OPPORTUNITY}</strong> sujetos.
        </p>
      </header>
      <OpportunityBody snapshot={q.data} loading={q.isLoading} error={!!q.error} />
    </section>
  );
}

function OpportunityBody({
  snapshot,
  loading,
  error,
}: {
  snapshot: OpportunitySnapshot | undefined;
  loading: boolean;
  error: boolean;
}) {
  if (error) {
    return (
      <p className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
        No fue posible cargar oportunidades.
      </p>
    );
  }
  if (loading || !snapshot) {
    return <p className="h-6 w-32 animate-pulse rounded bg-muted" />;
  }

  const b = snapshot.baseline;
  const jprDelta = b.jpr_current - b.jpr_previous;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-xl border border-border/60 bg-surface-raised p-4 text-xs md:grid-cols-3">
        <div>
          <p className="text-muted-foreground">Sujetos activos (actual · previo)</p>
          <p className="mt-1 font-mono text-sm">
            {b.active_subjects_current} · {b.active_subjects_previous}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">JPR actual vs previo</p>
          <p className="mt-1 font-mono text-sm">
            {(b.jpr_current * 100).toFixed(1)}% · {(b.jpr_previous * 100).toFixed(1)}%
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Δ JPR</p>
          <p
            className={
              "mt-1 font-mono text-sm " +
              (jprDelta > 0.005
                ? "text-success"
                : jprDelta < -0.005
                  ? "text-destructive"
                  : "text-muted-foreground")
            }
          >
            {jprDelta > 0 ? "+" : ""}
            {(jprDelta * 100).toFixed(1)} pp
          </p>
        </div>
      </div>

      {snapshot.status === "insufficient_data" ? (
        <div className="rounded-xl border border-dashed border-border bg-surface-raised p-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Muestra insuficiente</p>
          <p className="mt-1">{snapshot.reason}</p>
        </div>
      ) : snapshot.opportunities.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface-raised p-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Sin hallazgos significativos</p>
          <p className="mt-1">
            Ninguna transición se movió más de ±10% frente al periodo previo con
            muestra ≥ {MIN_SAMPLE_FOR_OPPORTUNITY}. El Journey se mantiene estable.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {snapshot.opportunities.map((o) => (
            <OpportunityCard key={o.id} o={o} />
          ))}
        </ul>
      )}

      <p className="text-[11px] text-muted-foreground">
        Contrato v{snapshot.contract_version} · referencia:{" "}
        <code>previous_period</code> · recomputado sin persistencia.
      </p>
    </div>
  );
}

function OpportunityCard({ o }: { o: Opportunity }) {
  const style = SEVERITY_STYLE[o.severity];
  const ev = o.evidence;
  return (
    <li className={"rounded-xl border-2 bg-surface p-4 " + style.ring}>
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <span
            className={
              "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide " +
              style.badge
            }
          >
            {style.label}
          </span>
          <h3 className="mt-2 text-sm font-semibold leading-snug">
            {o.headline}
          </h3>
        </div>
        <div className="text-right text-[11px] text-muted-foreground">
          <p>
            Transición: <code>{o.transition}</code>
          </p>
          <p>
            Métrica: <code>{o.metric_id}</code>
          </p>
          <p>
            Confianza: <strong>{ev.confidence}</strong> · n={ev.sample_size}
          </p>
        </div>
      </header>

      <dl className="mt-3 grid gap-2 text-xs md:grid-cols-2">
        <div>
          <dt className="font-semibold">¿Qué ocurre?</dt>
          <dd className="text-muted-foreground">{o.what_happens}</dd>
        </div>
        <div>
          <dt className="font-semibold">¿Por qué ocurre?</dt>
          <dd className="text-muted-foreground">{o.why_it_happens}</dd>
        </div>
        <div>
          <dt className="font-semibold">Impacto</dt>
          <dd className="text-muted-foreground">{o.impact}</dd>
        </div>
        <div>
          <dt className="font-semibold">Acción recomendada</dt>
          <dd className="text-muted-foreground">{o.recommended_action}</dd>
        </div>
        <div className="md:col-span-2">
          <dt className="font-semibold">KPI esperado</dt>
          <dd className="text-muted-foreground">{o.expected_kpi}</dd>
        </div>
      </dl>

      <p className="mt-3 rounded-lg bg-surface-raised p-2 text-[11px] font-mono text-muted-foreground">
        Evidencia · actual={ev.current_value} · previo={ev.reference_value} · Δ
        abs={ev.delta_absolute} · Δ rel={(ev.delta_relative * 100).toFixed(1)}% ·
        vs {ev.reference}
      </p>
    </li>
  );
}

/* --------------------------------------------------------------------- */
/* CV8.6 · Recommendation Validation Loop                                */
/* --------------------------------------------------------------------- */

/* --------------------------------------------------------------------- */
/* CV8.7 · Prescriptive Decision Prioritization                          */
/* --------------------------------------------------------------------- */

function PrioritizationSection({ window: win }: { window: 7 | 30 | 90 }) {
  const callOpps = useServerFn(detectJourneyOpportunities);
  const callVal = useServerFn(aggregateRecommendationValidation);
  const oppsQ = useQuery({
    queryKey: ["cms", "visitor-intel", "prio-opps", win],
    queryFn: () => callOpps({ data: { window_days: win } }),
    staleTime: 60_000,
  });
  const valQ = useQuery({
    queryKey: ["cms", "visitor-intel", "prio-validation", 90 as const],
    queryFn: () => callVal({ data: { window_days: 90 } }),
    staleTime: 60_000,
  });

  const ranked = useMemo(() => {
    if (!oppsQ.data) return null;
    return prioritizeOpportunities({
      opportunities: oppsQ.data.opportunities,
      validation: valQ.data ?? null,
    });
  }, [oppsQ.data, valQ.data]);

  return (
    <section className="space-y-4 rounded-2xl border-2 border-primary/40 bg-surface p-5">
      <header className="border-b border-border/60 pb-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
          CV8.7 · Prescriptive Decision Prioritization
        </p>
        <h2 className="mt-1 text-xl font-semibold tracking-tight">
          ¿Qué deberíamos hacer hoy?
        </h2>
        <p className="mt-1 max-w-3xl text-xs text-muted-foreground">
          Ranking prescriptivo derivado — cero persistencia. Combina{" "}
          <strong>confianza aprendida (CV8.6)</strong>, impacto, urgencia,
          alcance, etapa del Journey y beneficio para el ecosistema. Cada
          posición se justifica con factores auditables.
        </p>
        <div className="mt-3 flex flex-wrap gap-1 text-[10px] font-mono text-muted-foreground">
          {Object.entries(PRIORITIZATION_WEIGHTS).map(([k, v]) => (
            <span
              key={k}
              className="rounded-full border border-border bg-surface-raised px-2 py-0.5"
            >
              {k}: {(v * 100).toFixed(0)}%
            </span>
          ))}
        </div>
      </header>

      {oppsQ.error ? (
        <p className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          No fue posible cargar oportunidades para priorización.
        </p>
      ) : null}

      {oppsQ.isLoading || !ranked ? (
        <p className="h-6 w-40 animate-pulse rounded bg-muted" />
      ) : ranked.ranked.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface-raised p-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">
            Sin oportunidades priorizables en la ventana actual
          </p>
          <p className="mt-1">
            Cuando existan hallazgos con muestra suficiente, el motor los
            ordenará por impacto esperado.
          </p>
        </div>
      ) : (
        <ol className="space-y-3">
          {ranked.ranked.slice(0, 10).map((p) => (
            <PrioritizedCard key={p.opportunity.id} p={p} />
          ))}
        </ol>
      )}
    </section>
  );
}

function PrioritizedCard({ p }: { p: PrioritizedOpportunity }) {
  const reliabilityBadge =
    p.confidence_reliability === "reliable"
      ? "bg-success/15 text-success"
      : p.confidence_reliability === "learning"
        ? "bg-info/15 text-info"
        : p.confidence_reliability === "insufficient_data"
          ? "bg-warning/15 text-warning"
          : "bg-muted text-muted-foreground";
  return (
    <li className="rounded-xl border border-border bg-surface-raised p-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
            #{p.rank}
          </span>
          <div>
            <h3 className="text-sm font-semibold leading-snug">
              {p.opportunity.headline}
            </h3>
            <p className="mt-1 text-[11px] text-muted-foreground">
              <code>{p.opportunity.transition}</code> ·{" "}
              <code>{p.opportunity.metric_id}</code>
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold tracking-tight">
            {(p.score * 100).toFixed(0)}
          </p>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
            score / 100
          </p>
          <span
            className={
              "mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide " +
              reliabilityBadge
            }
          >
            confianza: {p.confidence_reliability === "insufficient_data" ? "n.d." : p.confidence_reliability}
          </span>
        </div>
      </header>

      <p className="mt-3 rounded-lg bg-surface p-2 text-xs italic text-foreground">
        {p.rationale}
      </p>

      <dl className="mt-3 grid gap-2 text-xs md:grid-cols-2">
        <div>
          <dt className="font-semibold">Acción recomendada</dt>
          <dd className="text-muted-foreground">{p.opportunity.recommended_action}</dd>
        </div>
        <div>
          <dt className="font-semibold">Resultado esperado</dt>
          <dd className="text-muted-foreground">{p.expected_effect}</dd>
        </div>
      </dl>

      <details className="mt-3">
        <summary className="cursor-pointer text-[11px] font-semibold text-primary hover:underline">
          Ver factores del score
        </summary>
        <ul className="mt-2 space-y-1 text-[11px]">
          {p.factors.map((f) => (
            <li
              key={f.key}
              className="flex items-start justify-between gap-2 rounded-md bg-surface p-2"
            >
              <div className="flex-1">
                <p className="font-mono font-semibold">
                  {f.key} · peso {(f.weight * 100).toFixed(0)}% · valor{" "}
                  {(f.value * 100).toFixed(0)}%
                </p>
                <p className="text-muted-foreground">{f.explanation}</p>
              </div>
              <span className="font-mono font-semibold text-primary">
                +{(f.contribution * 100).toFixed(1)}
              </span>
            </li>
          ))}
        </ul>
      </details>
    </li>
  );
}

const STATUS_STYLE: Record<
  string,
  { label: string; badge: string }
> = {
  detected: { label: "Detectada", badge: "bg-muted text-muted-foreground" },
  accepted: { label: "Aceptada", badge: "bg-info/15 text-info" },
  implemented: { label: "Implementada", badge: "bg-primary/15 text-primary" },
  observed: { label: "Observada", badge: "bg-warning/15 text-warning" },
  validated: { label: "Validada", badge: "bg-success/15 text-success" },
  discarded: { label: "Descartada", badge: "bg-destructive/15 text-destructive" },
};

/* --------------------------------------------------------------------- */
/* CV8.8 · Priorización por Segmento                                     */
/* --------------------------------------------------------------------- */

const FINDING_TYPE_META: Record<
  SegmentFindingType,
  { label: string; badge: string; short: string }
> = {
  commercial_opportunity: {
    label: "Oportunidad comercial",
    badge: "bg-success/15 text-success",
    short: "Amplificar",
  },
  experience_opportunity: {
    label: "Oportunidad de experiencia",
    badge: "bg-info/15 text-info",
    short: "Reducir fricción",
  },
  inclusion_opportunity: {
    label: "Oportunidad de inclusión",
    badge: "bg-primary/15 text-primary",
    short: "Auditar barreras",
  },
  abandonment_risk: {
    label: "Riesgo de abandono",
    badge: "bg-destructive/15 text-destructive",
    short: "Intervenir",
  },
  insufficient_data: {
    label: "Evidencia insuficiente",
    badge: "bg-muted text-muted-foreground",
    short: "Recolectar",
  },
};

function SegmentPrioritizationSection({ window: win }: { window: 7 | 30 | 90 }) {
  const callSeg = useServerFn(aggregateJourneySegments);
  const callVal = useServerFn(aggregateRecommendationValidation);

  const localeQ = useQuery({
    queryKey: ["cms", "visitor-intel", "seg-prio", "locale", win],
    queryFn: () => callSeg({ data: { dimension: "locale" as const, window_days: win } }),
    staleTime: 60_000,
  });
  const destQ = useQuery({
    queryKey: ["cms", "visitor-intel", "seg-prio", "destination", win],
    queryFn: () => callSeg({ data: { dimension: "destination" as const, window_days: win } }),
    staleTime: 60_000,
  });
  const capQ = useQuery({
    queryKey: ["cms", "visitor-intel", "seg-prio", "capability", win],
    queryFn: () => callSeg({ data: { dimension: "capability" as const, window_days: win } }),
    staleTime: 60_000,
  });
  const valQ = useQuery({
    queryKey: ["cms", "visitor-intel", "seg-prio", "validation", 90 as const],
    queryFn: () => callVal({ data: { window_days: 90 } }),
    staleTime: 60_000,
  });

  const loading =
    localeQ.isLoading || destQ.isLoading || capQ.isLoading || valQ.isLoading;
  const anyError = !!(localeQ.error || destQ.error || capQ.error);

  const result = useMemo(() => {
    const segments = [localeQ.data, destQ.data, capQ.data].filter(
      (s): s is NonNullable<typeof s> => Boolean(s),
    );
    if (segments.length === 0) return null;
    return prioritizeSegments({
      segments,
      validation: valQ.data ?? null,
    });
  }, [localeQ.data, destQ.data, capQ.data, valQ.data]);

  const pendingDims = [localeQ.data, destQ.data, capQ.data]
    .filter((s): s is NonNullable<typeof s> => Boolean(s))
    .filter((s) => s.status === "contract_pending")
    .map((s) => s.dimension);

  return (
    <section className="space-y-4 rounded-2xl border-2 border-primary/40 bg-surface p-5">
      <header className="border-b border-border/60 pb-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
          CV8.8 · Priorización por Segmento
        </p>
        <h2 className="mt-1 text-xl font-semibold tracking-tight">
          ¿Dónde actuar por segmento — con equidad?
        </h2>
        <p className="mt-1 max-w-3xl text-xs text-muted-foreground">
          Cruza segmentos oficiales de <strong>CV8.4</strong> con la confianza
          aprendida de <strong>CV8.6</strong>. Distingue oportunidad
          comercial, de experiencia, de inclusión, riesgo de abandono y
          evidencia insuficiente. Cada fila declara muestra, delta vs
          baseline, confianza, impacto esperado, riesgo de sesgo y
          explicación alternativa. Cero snapshots persistidos. Cero
          identidades individuales. Sujeto a{" "}
          <code>MIN_SEGMENT_POPULATION = {MIN_SEGMENT_POPULATION}</code>.
        </p>
        <div className="mt-3 flex flex-wrap gap-1 text-[10px] font-mono text-muted-foreground">
          {Object.entries(SEGMENT_PRIORITIZATION_WEIGHTS).map(([k, v]) => (
            <span
              key={k}
              className="rounded-full border border-border bg-surface-raised px-2 py-0.5"
            >
              {k}: {(v * 100).toFixed(0)}%
            </span>
          ))}
        </div>
      </header>

      {anyError ? (
        <p className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          No fue posible cargar la priorización por segmento.
        </p>
      ) : null}

      {pendingDims.length > 0 ? (
        <p className="rounded-xl border border-border bg-surface-raised p-3 text-[11px] text-muted-foreground">
          Dimensiones en <code>contract_pending</code>: {pendingDims.join(", ")}. Se
          activarán cuando el contrato de evento las incluya.
        </p>
      ) : null}

      {loading || !result ? (
        <p className="h-6 w-48 animate-pulse rounded bg-muted" />
      ) : result.findings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface-raised p-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Sin segmentos priorizables aún</p>
          <p className="mt-1">
            Aparecerán aquí cuando existan buckets con población ≥ {result.min_population}.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-2 text-[11px] md:grid-cols-5">
            {(Object.entries(result.summary.by_type) as [SegmentFindingType, number][]).map(
              ([t, n]) => (
                <span
                  key={t}
                  className={
                    "rounded-full px-2 py-1 text-center font-semibold " +
                    FINDING_TYPE_META[t].badge
                  }
                >
                  {FINDING_TYPE_META[t].short}: {n}
                </span>
              ),
            )}
          </div>
          <ol className="space-y-3">
            {result.findings.map((f) => (
              <SegmentFindingCard key={`${f.dimension}:${f.segment_key}`} f={f} />
            ))}
          </ol>
        </>
      )}
    </section>
  );
}

function SegmentFindingCard({ f }: { f: SegmentFinding }) {
  const meta = FINDING_TYPE_META[f.type];
  const biasBadge =
    f.bias_risk === "low"
      ? "bg-success/15 text-success"
      : f.bias_risk === "medium"
        ? "bg-warning/15 text-warning"
        : "bg-destructive/15 text-destructive";
  return (
    <li className="rounded-xl border border-border bg-surface-raised p-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
            #{f.rank}
          </span>
          <div>
            <h3 className="text-sm font-semibold leading-snug">
              {f.segment_label}
            </h3>
            <p className="mt-1 text-[11px] text-muted-foreground">
              <code>{f.dimension}</code> · n={f.sample_size} · JPR{" "}
              {(f.jpr * 100).toFixed(1)}% vs baseline{" "}
              {(f.baseline_jpr * 100).toFixed(1)}% ·{" "}
              <strong
                className={
                  f.delta_vs_baseline >= 0 ? "text-success" : "text-destructive"
                }
              >
                Δ {(f.delta_vs_baseline * 100).toFixed(1)}%
              </strong>
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 text-right">
          {f.type !== "insufficient_data" ? (
            <p className="text-2xl font-bold tracking-tight">
              {(f.score * 100).toFixed(0)}
            </p>
          ) : (
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              n.d.
            </p>
          )}
          <span
            className={
              "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide " +
              meta.badge
            }
          >
            {meta.label}
          </span>
          <span
            className={
              "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide " +
              biasBadge
            }
          >
            sesgo: {f.bias_risk}
          </span>
        </div>
      </header>

      <p className="mt-3 rounded-lg bg-surface p-2 text-xs italic text-foreground">
        {f.rationale}
      </p>

      <dl className="mt-3 grid gap-2 text-xs md:grid-cols-2">
        <div>
          <dt className="font-semibold">Acción recomendada</dt>
          <dd className="text-muted-foreground">{f.recommended_action}</dd>
        </div>
        <div>
          <dt className="font-semibold">Impacto esperado</dt>
          <dd className="text-muted-foreground">{f.expected_impact}</dd>
        </div>
      </dl>

      <details className="mt-3">
        <summary className="cursor-pointer text-[11px] font-semibold text-primary hover:underline">
          Explicaciones alternativas (revisar antes de concluir)
        </summary>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-[11px] text-muted-foreground">
          {f.alternative_explanations.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      </details>

      {f.type !== "insufficient_data" ? (
        <details className="mt-2">
          <summary className="cursor-pointer text-[11px] font-semibold text-primary hover:underline">
            Ver factores del score
          </summary>
          <ul className="mt-2 space-y-1 text-[11px]">
            {f.factors.map((fac) => (
              <li
                key={fac.key}
                className="flex items-start justify-between gap-2 rounded-md bg-surface p-2"
              >
                <div className="flex-1">
                  <p className="font-mono font-semibold">
                    {fac.key} · peso {(fac.weight * 100).toFixed(0)}% · valor{" "}
                    {(fac.value * 100).toFixed(0)}%
                  </p>
                  <p className="text-muted-foreground">{fac.explanation}</p>
                </div>
                <span className="font-mono font-semibold text-primary">
                  +{(fac.contribution * 100).toFixed(1)}
                </span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </li>
  );
}

function ValidationLoopSection() {
  const [win, setWin] = useState<30 | 90 | 180>(90);
  const call = useServerFn(aggregateRecommendationValidation);
  const q = useQuery({
    queryKey: ["cms", "visitor-intel", "recommendation-validation", win],
    queryFn: () => call({ data: { window_days: win } }),
    staleTime: 60_000,
  });

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-surface p-5">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-border/60 pb-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
            CV8.6 · Recommendation Validation Loop
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight">
            ¿Nuestras recomendaciones mejoraron el Journey?
          </h2>
          <p className="mt-1 max-w-2xl text-xs text-muted-foreground">
            Ciclo de vida completo de cada recomendación: detectada → aceptada →
            implementada → observada → validada / descartada. Confianza aprendida
            desde resultados observados (n ≥ <strong>{MIN_FAMILY_SIGNAL}</strong>
            por familia). Sin reglas manuales ocultas.
          </p>
        </div>
        <div className="flex gap-1 rounded-full border border-border p-1 text-xs">
          {[30, 90, 180].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setWin(n as 30 | 90 | 180)}
              className={
                "rounded-full px-3 py-1 " +
                (win === n
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground")
              }
            >
              {n}d
            </button>
          ))}
        </div>
      </header>

      <ValidationLoopBody snapshot={q.data} loading={q.isLoading} error={!!q.error} />
    </section>
  );
}

function ValidationLoopBody({
  snapshot,
  loading,
  error,
}: {
  snapshot: RecommendationValidationSnapshot | undefined;
  loading: boolean;
  error: boolean;
}) {
  if (error) {
    return (
      <p className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
        No fue posible cargar el ciclo de validación.
      </p>
    );
  }
  if (loading || !snapshot) return <p className="h-6 w-32 animate-pulse rounded bg-muted" />;

  const total =
    snapshot.active.length + snapshot.closed.length;

  if (total === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface-raised p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Sin recomendaciones registradas</p>
        <p className="mt-1">
          Cuando el equipo marque una oportunidad como <em>aceptada</em>, aparecerá
          aquí y podrá recorrer su ciclo de vida completo hasta la validación.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {Object.entries(snapshot.totals).map(([status, count]) => (
          <div
            key={status}
            className="rounded-xl border border-border bg-surface-raised p-3"
          >
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {STATUS_STYLE[status]?.label ?? status}
            </p>
            <p className="mt-1 text-xl font-semibold">{count}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-semibold">Ciclo activo</h3>
          {snapshot.active.length === 0 ? (
            <p className="text-xs text-muted-foreground">Ninguna en curso.</p>
          ) : (
            <ul className="space-y-2">
              {snapshot.active.map((r) => (
                <RecommendationLifecycleCard key={r.recommendation_id} r={r} />
              ))}
            </ul>
          )}
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold">Cerradas (aprendizaje)</h3>
          {snapshot.closed.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Aún no hay recomendaciones validadas o descartadas.
            </p>
          ) : (
            <ul className="space-y-2">
              {snapshot.closed.slice(0, 8).map((r) => (
                <RecommendationLifecycleCard key={r.recommendation_id} r={r} />
              ))}
            </ul>
          )}
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold">
          Confianza aprendida por familia de KPI
        </h3>
        {snapshot.family_confidence.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Aún no hay resultados observados. La confianza se aprenderá al cerrar
            recomendaciones con evidencia.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-xs">
              <thead className="bg-surface-raised text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="p-2">Métrica</th>
                  <th className="p-2">Muestra</th>
                  <th className="p-2">Validadas</th>
                  <th className="p-2">Descartadas</th>
                  <th className="p-2">Confianza aprendida</th>
                  <th className="p-2">Fiabilidad</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.family_confidence.map((f) => (
                  <FamilyRow key={f.metric_id} f={f} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground">
        Contrato v{snapshot.contract_version} · Estado recomputado desde el
        historial append-only (Founder Journey State).
      </p>
    </div>
  );
}

function RecommendationLifecycleCard({ r }: { r: RecommendationRecord }) {
  const style = STATUS_STYLE[r.current_status];
  return (
    <li className="rounded-xl border border-border bg-surface p-3">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold">{r.recommendation_id}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            <code>{r.metric_id}</code> · <code>{r.transition}</code>
          </p>
        </div>
        <span
          className={
            "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide " +
            (style?.badge ?? "bg-muted text-muted-foreground")
          }
        >
          {style?.label ?? r.current_status}
        </span>
      </header>
      <ol className="mt-2 flex flex-wrap gap-1 text-[10px]">
        {r.timeline.map((s, i) => (
          <li
            key={i}
            className={
              "rounded-full px-2 py-0.5 " +
              (STATUS_STYLE[s.status]?.badge ?? "bg-muted text-muted-foreground")
            }
            title={`${s.actor} · ${new Date(s.occurred_at).toLocaleString()}`}
          >
            {STATUS_STYLE[s.status]?.label ?? s.status}
          </li>
        ))}
      </ol>
      {r.latest_outcome ? (
        <p className="mt-2 text-[11px] text-muted-foreground">
          Evidencia: {r.latest_outcome.kpi_before.toFixed(3)} →{" "}
          {r.latest_outcome.kpi_after.toFixed(3)} (
          {(r.latest_outcome.delta_relative * 100).toFixed(1)}%){" "}
          {r.latest_outcome.transition_advanced ? "· transición avanzada" : ""}
        </p>
      ) : null}
    </li>
  );
}

function FamilyRow({ f }: { f: FamilyLearningSignal }) {
  const badge =
    f.reliability === "reliable"
      ? "bg-success/15 text-success"
      : f.reliability === "learning"
        ? "bg-warning/15 text-warning"
        : "bg-muted text-muted-foreground";
  return (
    <tr className="border-t border-border">
      <td className="p-2 font-mono text-[11px]">{f.metric_id}</td>
      <td className="p-2">{f.sample_size}</td>
      <td className="p-2 text-success">{f.validated}</td>
      <td className="p-2 text-destructive">{f.discarded}</td>
      <td className="p-2 font-semibold">
        {(f.learned_confidence * 100).toFixed(0)}%
      </td>
      <td className="p-2">
        <span
          className={
            "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide " +
            badge
          }
        >
          {f.reliability === "insufficient_data"
            ? "muestra insuficiente"
            : f.reliability}
        </span>
      </td>
    </tr>
  );
}
