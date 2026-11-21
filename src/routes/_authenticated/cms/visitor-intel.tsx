/**
 * CV8.3 · Visitor Intelligence Center — Console v1.0
 *
 * Superficie ejecutiva compuesta por Decision Cards. Cada tarjeta
 * responde 3 preguntas: qué ocurre, por qué y qué decisión permite.
 * Reutiliza KPI_CATALOG (CV8.0) y `aggregateJourneyIntel` (CV8.3).
 */
import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { toast } from "sonner";

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
import { KPI_CATALOG, type JourneyTransitionId } from "@/lib/visitor-intel";
import {
  decisionSourceFromPrioritizedOpportunity,
  decisionSourceFromSegmentFinding,
  type DecisionSource,
} from "@/lib/visitor-intel/decisions";
import { getDecisionActorAccess, proposeDecision } from "@/lib/visitor-intel/decisions.functions";
import {
  DIMENSION_LABEL,
  factorLabel,
  levelLabel,
  metricAction,
  metricLabel,
  reliabilityLabel,
  segmentValueLabel,
  transitionLabel,
} from "@/lib/visitor-intel/plain-language";
import { PagePerformancePanel } from "@/components/visitor-intel/PagePerformancePanel";
import { VisitorIntelModuleNav } from "@/components/visitor-intel/VisitorIntelModuleNav";

export const Route = createFileRoute("/_authenticated/cms/visitor-intel")({
  validateSearch: z.object({
    mode: z.enum(["real", "simulation", "combined"]).optional(),
    run: z.string().uuid().optional(),
  }),
  head: () => ({
    meta: [
      { title: "Inteligencia del visitante · CMS · Valladolid.mx" },
      {
        name: "description",
        content:
          "Inteligencia del visitante: cómo descubren, planean y reservan los visitantes, y qué hacer con cada cifra.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: VisitorIntelCenter,
});

type Windw = 7 | 30 | 90;

function VisitorIntelCenter() {
  const search = Route.useSearch();
  const mode = search.mode ?? "real";
  const runId = search.run;
  const [win, setWin] = useState<Windw>(30);
  const call = useServerFn(aggregateJourneyIntel);
  const q = useQuery({
    queryKey: ["cms", "visitor-intel", win, mode, runId ?? "none"],
    queryFn: () => call({ data: { window_days: win, mode, simulation_run_id: runId } }),
    staleTime: 60_000,
  });

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      {mode !== "real" && (
        <div
          className={
            "flex flex-wrap items-center justify-between gap-3 rounded-lg border-2 px-4 py-3 text-sm font-medium " +
            (mode === "simulation"
              ? "border-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
              : "border-blue-500 bg-blue-50 text-blue-900 dark:bg-blue-950/40 dark:text-blue-100")
          }
          role="status"
        >
          <span>
            {mode === "simulation" ? "🧪 MODO SIMULACIÓN" : "🔀 MODO COMBINADO (real + simulación)"}
            {runId ? ` · prueba ${runId.slice(0, 8)}…` : ""}
            {" · "}
            <span className="font-normal opacity-80">
              Las tarjetas principales usan sólo esta simulación. Cambios, grupos y seguimiento aún
              mezclan datos reales y simulados.
            </span>
          </span>
          <Link
            to="/cms/visitor-intel"
            search={{}}
            className="rounded-md border border-current px-3 py-1 text-xs uppercase tracking-wider"
          >
            Salir a modo real
          </Link>
        </div>
      )}
      <header className="border-b border-border pb-5">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
          Monitor de visitantes
        </p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Inteligencia del visitante</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Cada tarjeta responde una pregunta sobre cómo los visitantes descubren, planean y
              reservan, y te dice qué puedes hacer con esa cifra. Periodo:{" "}
              <strong>{win} días</strong>.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/cms/visitor-intel/decisions"
              className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
            >
              Ver decisiones del equipo
            </Link>
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
                  {n} días
                </button>
              ))}
            </div>
          </div>
        </div>
        <ReadingGuide />
      </header>

      {q.error ? (
        <p className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          No fue posible cargar el monitor. Necesitas ser administrador para verlo.
        </p>
      ) : null}

      <VisitorIntelModuleNav />
      <div id="mod-conversion" className="scroll-mt-24">
        <IntelModules snapshot={q.data} loading={q.isLoading} />
      </div>
      <div id="mod-embudo" className="scroll-mt-24">
        <PagePerformancePanel />
      </div>
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
  { id: "locale", label: "Idioma", hint: "Idioma del navegador del visitante" },
  { id: "destination", label: "Destino", hint: "Destino que estaba viendo" },
  { id: "capability", label: "Sección del sitio", hint: "Parte del sitio donde ocurrió la señal" },
  { id: "country", label: "País", hint: "Aún no disponible" },
  { id: "channel", label: "Canal", hint: "Aún no disponible" },
  { id: "device", label: "Dispositivo", hint: "Aún no disponible" },
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
            Grupos de visitantes
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight">
            ¿Cómo avanza cada grupo de visitantes?
          </h2>
          <p className="mt-1 max-w-2xl text-xs text-muted-foreground">
            Compara grupos por idioma, destino o sección del sitio. Sólo se muestran grupos de al
            menos <strong>{MIN_SEGMENT_POPULATION}</strong> personas; los más pequeños se juntan en{" "}
            <em>Otros</em> para cuidar la privacidad. Nunca se identifica a nadie.
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
        No fue posible cargar los grupos de visitantes.
      </p>
    );
  }
  if (loading || !snapshot) {
    return <p className="h-6 w-32 animate-pulse rounded bg-muted" />;
  }

  if (snapshot.status === "contract_pending") {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface-raised p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Este grupo aún no está disponible</p>
        <p className="mt-1">{snapshot.pending_reason}</p>
      </div>
    );
  }

  if (snapshot.status === "empty" || snapshot.buckets.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface-raised p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">
          Todavía no hay suficientes visitantes en este periodo
        </p>
        <p className="mt-1">
          Promedio general: <strong>{snapshot.baseline.active_subjects}</strong> personas · avance{" "}
          {(snapshot.baseline.jpr * 100).toFixed(1)}%. Se activará cuando haya grupos de al menos{" "}
          {snapshot.min_population} personas.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Promedio general: <strong>{snapshot.baseline.active_subjects}</strong> personas · avance{" "}
        <strong>{(snapshot.baseline.jpr * 100).toFixed(1)}%</strong>. «Diferencia» = avance del
        grupo menos el promedio, en puntos.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="py-2">Grupo</th>
              <th>Personas</th>
              <th>Avanzaron</th>
              <th>Avance</th>
              <th>Diferencia</th>
              <th>Señales de interés</th>
              <th>Crearon cuenta</th>
              <th>Armaron viaje</th>
              <th>Reservaron</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.buckets.map((b) => (
              <SegmentRow key={b.key} b={b} dimension={snapshot.dimension} />
            ))}
            {snapshot.others ? (
              <SegmentRow b={snapshot.others} dimension={snapshot.dimension} />
            ) : null}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Agrupado por {(DIMENSION_LABEL[snapshot.dimension] ?? snapshot.dimension).toLowerCase()}. Se
        calcula al momento con los datos del periodo; no se guarda ninguna copia.
      </p>
    </div>
  );
}

function SegmentRow({
  b,
  dimension,
}: {
  b: JourneySegmentSnapshot["buckets"][number];
  dimension: SegmentDimension;
}) {
  const delta = b.jpr_delta_vs_baseline;
  const deltaColor =
    delta > 0.02 ? "text-success" : delta < -0.02 ? "text-destructive" : "text-muted-foreground";
  return (
    <tr className="border-t border-border/60">
      <td className="py-2 font-medium">
        {segmentValueLabel(dimension, b.key, b.label)}
        {b.suppressed ? (
          <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
            agrupado
          </span>
        ) : null}
      </td>
      <td className="font-mono">{b.active_subjects}</td>
      <td className="font-mono">{b.progressed_subjects}</td>
      <td className="font-mono">{(b.jpr * 100).toFixed(1)}%</td>
      <td className={"font-mono " + deltaColor}>
        {delta > 0 ? "+" : ""}
        {(delta * 100).toFixed(1)} puntos
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
  const kpi = useMemo(() => Object.fromEntries(KPI_CATALOG.map((k) => [k.id, k])), []);

  const t = (id: JourneyTransitionId) => snapshot?.transitions.find((x) => x.id === id);

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <DecisionCard
        title="Recorrido del viajero, paso a paso"
        question="¿En qué paso se detienen los visitantes?"
        why="Cuenta cuántas personas dieron cada uno de los 9 pasos, desde llegar al sitio hasta recomendarlo."
        decision={metricAction("JPR_30D", kpi["JPR_30D"]?.actionable_decision)}
        value={
          snapshot
            ? `${snapshot.progressed_subjects} de ${snapshot.active_subjects} avanzaron`
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
                  <span className="text-muted-foreground">{transitionLabel(row.id)}</span>
                  <span className="font-mono">{row.distinct_subjects}</span>
                </li>
              ))}
            </ul>
          ) : null
        }
        activatesWhen="lleguen las primeras señales de avance de los visitantes."
        loading={loading}
      />

      <DecisionCard
        title="Avance del recorrido"
        question="¿Qué parte de los visitantes dio al menos un paso?"
        why="Es el indicador principal: personas que avanzaron entre personas que visitaron en el periodo."
        decision={metricAction("JPR_30D", kpi["JPR_30D"]?.actionable_decision)}
        value={snapshot ? `${(snapshot.jpr * 100).toFixed(1)} %` : undefined}
        activatesWhen="haya al menos un visitante con actividad."
        loading={loading}
      />

      <DecisionCard
        title="Visitantes que crearon su cuenta"
        question="¿Cuántos visitantes sin cuenta se registraron?"
        why="Paso 2 · Creó su cuenta. Depende de los momentos en que invitamos a registrarse."
        decision={metricAction("T2_conversion", kpi["T2_conversion"]?.actionable_decision)}
        value={
          snapshot
            ? `${t("T2_anonymous_to_identified")?.distinct_subjects ?? 0} personas`
            : undefined
        }
        activatesWhen="alguien cree su cuenta después de visitar."
        loading={loading}
      />

      <DecisionCard
        title="Viajes armados en Mi Viaje"
        question="¿Cuántas personas armaron un viaje con al menos un lugar real?"
        why="Paso 5 · Armó su viaje. Depende de qué tan fácil es pasar de lo que sugiere Alux a Mi Viaje."
        decision={metricAction("T5_conversion", kpi["T5_conversion"]?.actionable_decision)}
        value={
          snapshot
            ? `${t("T5_interested_to_travel_plan")?.distinct_subjects ?? 0} viajeros`
            : undefined
        }
        activatesWhen="alguien arme su primer viaje."
        loading={loading}
      />

      <DecisionCard
        title="Alux · Señales de interés"
        question="¿Cuánto interés despiertan Alux y las páginas para descubrir?"
        why="Suma cada vez que alguien guarda, compara, agrega a su viaje o le pide algo a Alux."
        decision={metricAction("T4_conversion")}
        value={snapshot ? `${snapshot.intent_signals_total} señales` : undefined}
        activatesWhen="los visitantes empiecen a guardar o pedir sugerencias."
        loading={loading}
      />

      <DecisionCard
        title="Viajes enviados al concierge"
        question="¿Cuántos viajes se enviaron al concierge para que los atienda?"
        why="Paso 6 · Pidió ayuda al concierge. Depende de qué tan clara es la invitación de Alux."
        decision={metricAction("T6_conversion", kpi["T6_conversion"]?.actionable_decision)}
        value={
          snapshot ? `${t("T6_travel_plan_to_concierge")?.distinct_subjects ?? 0} casos` : undefined
        }
        activatesWhen="alguien envíe su viaje al concierge."
        loading={loading}
      />

      <DecisionCard
        title="Reservas logradas por el concierge"
        question="¿Cuántos casos del concierge terminaron en reserva?"
        why="Paso 7 · Reservó. Depende de las propuestas del concierge y del proceso de pago."
        decision={metricAction("T7_conversion", kpi["T7_conversion"]?.actionable_decision)}
        value={
          snapshot
            ? `${t("T7_concierge_to_reservation")?.distinct_subjects ?? 0} reservas`
            : undefined
        }
        activatesWhen="un caso del concierge termine en reserva."
        loading={loading}
      />

      <DecisionCard
        title="Empresas que más interés generan"
        question="¿Qué empresas despiertan más interés?"
        why="Necesita separar las señales de interés por empresa."
        decision="Dar más visibilidad a empresas con mucho interés y pocas reservas."
        activatesWhen="las señales se puedan separar por empresa."
        loading={loading}
      />

      <DecisionCard
        title="Destinos que más hacen avanzar"
        question="¿Qué destinos hacen que más visitantes avancen en su viaje?"
        why="Necesita separar el avance de los visitantes por destino."
        decision="Dedicar más contenido a los destinos que mejor hacen avanzar al viajero."
        activatesWhen="el avance se pueda separar por destino."
        loading={loading}
      />

      <DecisionCard
        title="Regresos que encuentran su viaje"
        question="¿Los viajeros que regresan encuentran su viaje donde lo dejaron?"
        why="Indicador de control: cuida que la experiencia no empeore aunque suban las demás cifras."
        decision={metricAction("CONTINUITY_RATE", kpi["CONTINUITY_RATE"]?.actionable_decision)}
        activatesWhen="se registren los primeros regresos de visitantes."
        loading={loading}
      />

      <DecisionCard
        title="Embajadores"
        question="¿Cuántos viajeros recomendaron Valladolid.mx después de su viaje?"
        why="Paso 9 · Recomendó a otros."
        decision={metricAction("T9_conversion", kpi["T9_conversion"]?.actionable_decision)}
        value={
          snapshot
            ? `${t("T9_traveler_to_ambassador")?.distinct_subjects ?? 0} embajadores`
            : undefined
        }
        activatesWhen="un viajero recomiende Valladolid.mx después de su viaje."
        loading={loading}
      />

      <DecisionCard
        title="Alertas de caídas"
        question="¿Hay algún paso cayendo por debajo de lo normal?"
        why="Necesita definir qué cifra es «normal» para cada paso."
        decision="Atender de inmediato el paso que está cayendo."
        activatesWhen="se defina la cifra de referencia de cada paso."
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
            (hasData ? "bg-success/15 text-success" : "bg-muted text-muted-foreground")
          }
        >
          {hasData ? "Con datos" : "Sin datos aún"}
        </span>
      </header>

      <p className="mt-2 text-xs text-muted-foreground">
        <strong className="text-foreground">Qué responde:</strong> {question}
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
          <strong>Cómo se mide:</strong> <span className="text-muted-foreground">{why}</span>
        </p>
        <p>
          <strong>Para qué te sirve:</strong>{" "}
          <span className="text-muted-foreground">{decision}</span>
        </p>
      </div>
    </article>
  );
}
/* --------------------------------------------------------------------- */
/* CV8.5 · Benchmarks & Opportunity Intelligence                         */
/* --------------------------------------------------------------------- */

const SEVERITY_STYLE: Record<OpportunitySeverity, { label: string; badge: string; ring: string }> =
  {
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
          Cambios importantes
        </p>
        <h2 className="mt-1 text-xl font-semibold tracking-tight">
          ¿Qué cambió frente al periodo anterior?
        </h2>
        <p className="mt-1 max-w-2xl text-xs text-muted-foreground">
          Compara este periodo con el anterior y avisa cuando un paso sube o baja más de 10%. Cada
          hallazgo explica qué pasó, por qué importa y qué hacer. Necesita al menos{" "}
          <strong>{MIN_SAMPLE_FOR_OPPORTUNITY}</strong> visitantes.
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
        No fue posible cargar los cambios importantes.
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
          <p className="text-muted-foreground">Visitantes (ahora · antes)</p>
          <p className="mt-1 font-mono text-sm">
            {b.active_subjects_current} · {b.active_subjects_previous}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Avance del recorrido (ahora · antes)</p>
          <p className="mt-1 font-mono text-sm">
            {(b.jpr_current * 100).toFixed(1)}% · {(b.jpr_previous * 100).toFixed(1)}%
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Diferencia</p>
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
            {(jprDelta * 100).toFixed(1)} puntos
          </p>
        </div>
      </div>

      {snapshot.status === "insufficient_data" ? (
        <div className="rounded-xl border border-dashed border-border bg-surface-raised p-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Todavía hay pocos datos</p>
          <p className="mt-1">{snapshot.reason}</p>
        </div>
      ) : snapshot.opportunities.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface-raised p-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Sin cambios importantes</p>
          <p className="mt-1">
            Ningún paso subió ni bajó más de 10% frente al periodo anterior (con al menos{" "}
            {MIN_SAMPLE_FOR_OPPORTUNITY} visitantes). El recorrido se mantiene estable.
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
        Se compara con el periodo anterior de la misma duración. Se calcula al momento; no se guarda
        ninguna copia.
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
          <h3 className="mt-2 text-sm font-semibold leading-snug">{o.headline}</h3>
        </div>
        <div className="text-right text-[11px] text-muted-foreground">
          <p>{transitionLabel(o.transition)}</p>
          <p>Indicador: {metricLabel(o.metric_id)}</p>
          <p>
            Confianza: <strong>{levelLabel(ev.confidence)}</strong> · {ev.sample_size} personas
          </p>
        </div>
      </header>

      <dl className="mt-3 grid gap-2 text-xs md:grid-cols-2">
        <div>
          <dt className="font-semibold">¿Qué pasó?</dt>
          <dd className="text-muted-foreground">{o.what_happens}</dd>
        </div>
        <div>
          <dt className="font-semibold">¿Cómo se mide?</dt>
          <dd className="text-muted-foreground">{o.why_it_happens}</dd>
        </div>
        <div>
          <dt className="font-semibold">¿Por qué importa?</dt>
          <dd className="text-muted-foreground">{o.impact}</dd>
        </div>
        <div>
          <dt className="font-semibold">Qué hacer</dt>
          <dd className="text-muted-foreground">{o.recommended_action}</dd>
        </div>
        <div className="md:col-span-2">
          <dt className="font-semibold">Meta para el siguiente periodo</dt>
          <dd className="text-muted-foreground">{o.expected_kpi}</dd>
        </div>
      </dl>

      <p className="mt-3 rounded-lg bg-surface-raised p-2 text-[11px] text-muted-foreground">
        {evidenceText(o)}
      </p>
    </li>
  );
}

/** Cifras del hallazgo en palabras: porcentajes para el avance general. */
function evidenceText(o: Opportunity): string {
  const ev = o.evidence;
  const rel = `${ev.delta_relative > 0 ? "+" : ""}${(ev.delta_relative * 100).toFixed(1)}%`;
  if (o.transition === "aggregate") {
    return `Cifras · ahora ${(ev.current_value * 100).toFixed(1)}% · antes ${(ev.reference_value * 100).toFixed(1)}% · cambio ${rel}`;
  }
  return `Cifras · ahora ${ev.current_value} personas · antes ${ev.reference_value} · cambio ${ev.delta_absolute > 0 ? "+" : ""}${ev.delta_absolute} (${rel})`;
}

/** Guía breve para leer el monitor sin términos técnicos. */
function ReadingGuide() {
  return (
    <details className="mt-4 rounded-xl border border-border bg-surface-raised p-3 text-xs text-muted-foreground">
      <summary className="cursor-pointer font-semibold text-foreground">
        ¿Cómo leer esta pantalla?
      </summary>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li>
          <strong className="text-foreground">Recorrido del viajero:</strong> los 9 pasos que da una
          persona, desde llegar al sitio, crear su cuenta, explorar, mostrar interés, armar su viaje
          y pedir ayuda al concierge, hasta reservar, viajar y recomendarnos.
        </li>
        <li>
          <strong className="text-foreground">Avance del recorrido:</strong> qué parte de los
          visitantes dio al menos un paso en el periodo. Es el indicador principal.
        </li>
        <li>
          <strong className="text-foreground">Señales de interés:</strong> cada vez que alguien
          guarda, compara, agrega a su viaje o le pide algo a Alux.
        </li>
        <li>
          <strong className="text-foreground">Grupos:</strong> visitantes agrupados por idioma,
          destino o sección del sitio. Nunca se identifica a nadie.
        </li>
        <li>
          <strong className="text-foreground">Puntos:</strong> diferencia entre dos porcentajes. Si
          un grupo avanza 40% y el promedio 50%, está 10 puntos abajo.
        </li>
        <li>
          <strong className="text-foreground">Prioridad (de 100):</strong> qué tan urgente es
          atender un hallazgo. Abre «Ver por qué» para conocer cada razón.
        </li>
        <li>
          <strong className="text-foreground">Decisiones del equipo:</strong> cuando una
          recomendación te convence, pásala a decisiones para asignarla y darle seguimiento. Nada
          cambia en el sitio por sí solo.
        </li>
      </ul>
    </details>
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
    queryKey: ["cms", "visitor-intel", "recommendation-validation", 90 as const],
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
          Prioridades de hoy
        </p>
        <h2 className="mt-1 text-xl font-semibold tracking-tight">¿Qué deberíamos hacer hoy?</h2>
        <p className="mt-1 max-w-3xl text-xs text-muted-foreground">
          Ordena los cambios importantes de más a menos urgente. Toma en cuenta qué tan seguros
          estamos (según recomendaciones anteriores), el tamaño del cambio, la urgencia, cuántas
          personas alcanza, la etapa del recorrido y el beneficio para el destino. Cada prioridad
          muestra por qué quedó en ese lugar.
        </p>
        <div className="mt-3 flex flex-wrap gap-1 text-[10px] font-mono text-muted-foreground">
          {Object.entries(PRIORITIZATION_WEIGHTS).map(([k, v]) => (
            <span
              key={k}
              className="rounded-full border border-border bg-surface-raised px-2 py-0.5"
            >
              {factorLabel(k)}: {(v * 100).toFixed(0)}%
            </span>
          ))}
        </div>
      </header>

      {oppsQ.error ? (
        <p className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          No fue posible cargar las prioridades.
        </p>
      ) : null}

      {oppsQ.isLoading || !ranked ? (
        <p className="h-6 w-40 animate-pulse rounded bg-muted" />
      ) : ranked.ranked.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface-raised p-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Sin prioridades por ahora</p>
          <p className="mt-1">
            Cuando haya cambios importantes con suficientes datos, aparecerán aquí ordenados por
            urgencia.
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
            <h3 className="text-sm font-semibold leading-snug">{p.opportunity.headline}</h3>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {transitionLabel(p.opportunity.transition)} · {metricLabel(p.opportunity.metric_id)}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold tracking-tight">{(p.score * 100).toFixed(0)}</p>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
            prioridad / 100
          </p>
          <span
            className={
              "mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide " +
              reliabilityBadge
            }
          >
            confianza: {reliabilityLabel(p.confidence_reliability)}
          </span>
        </div>
      </header>

      <p className="mt-3 rounded-lg bg-surface p-2 text-xs italic text-foreground">{p.rationale}</p>

      <dl className="mt-3 grid gap-2 text-xs md:grid-cols-2">
        <div>
          <dt className="font-semibold">Qué hacer</dt>
          <dd className="text-muted-foreground">{p.opportunity.recommended_action}</dd>
        </div>
        <div>
          <dt className="font-semibold">Resultado esperado</dt>
          <dd className="text-muted-foreground">{p.expected_effect}</dd>
        </div>
      </dl>

      <details className="mt-3">
        <summary className="cursor-pointer text-[11px] font-semibold text-primary hover:underline">
          Ver por qué tiene esta prioridad
        </summary>
        <ul className="mt-2 space-y-1 text-[11px]">
          {p.factors.map((f) => (
            <li
              key={f.key}
              className="flex items-start justify-between gap-2 rounded-md bg-surface p-2"
            >
              <div className="flex-1">
                <p className="font-semibold">
                  {factorLabel(f.key)} · pesa {(f.weight * 100).toFixed(0)}% · obtuvo{" "}
                  {(f.value * 100).toFixed(0)}%
                </p>
                <p className="text-muted-foreground">{f.explanation}</p>
              </div>
              <span className="font-mono font-semibold text-primary">
                +{(f.contribution * 100).toFixed(1)} pts
              </span>
            </li>
          ))}
        </ul>
      </details>
      <DecisionProposalButton source={decisionSourceFromPrioritizedOpportunity(p)} />
    </li>
  );
}

const STATUS_STYLE: Record<string, { label: string; badge: string }> = {
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
    short: "Dar visibilidad",
  },
  experience_opportunity: {
    label: "Oportunidad de experiencia",
    badge: "bg-info/15 text-info",
    short: "Quitar obstáculos",
  },
  inclusion_opportunity: {
    label: "Oportunidad de inclusión",
    badge: "bg-primary/15 text-primary",
    short: "Revisar barreras",
  },
  abandonment_risk: {
    label: "Riesgo de abandono",
    badge: "bg-destructive/15 text-destructive",
    short: "Atender ya",
  },
  insufficient_data: {
    label: "Pocos datos",
    badge: "bg-muted text-muted-foreground",
    short: "Esperar datos",
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
    queryKey: ["cms", "visitor-intel", "recommendation-validation", 90 as const],
    queryFn: () => callVal({ data: { window_days: 90 } }),
    staleTime: 60_000,
  });

  const loading = localeQ.isLoading || destQ.isLoading || capQ.isLoading || valQ.isLoading;
  const anyError = !!(localeQ.error || destQ.error || capQ.error);

  const result = useMemo(() => {
    const segments = [localeQ.data, destQ.data, capQ.data].filter((s): s is NonNullable<typeof s> =>
      Boolean(s),
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
          Prioridades por grupo
        </p>
        <h2 className="mt-1 text-xl font-semibold tracking-tight">
          ¿Qué grupo de visitantes necesita atención?
        </h2>
        <p className="mt-1 max-w-3xl text-xs text-muted-foreground">
          Revisa cada grupo (por idioma, destino y sección del sitio) y lo clasifica: oportunidad
          comercial, de experiencia o de inclusión, riesgo de abandono o pocos datos. Cada uno
          muestra cuántas personas son, cómo avanzan frente al promedio, qué tan seguro es el dato,
          el riesgo de sacar una conclusión equivocada y otras posibles explicaciones. Sólo grupos
          de al menos {MIN_SEGMENT_POPULATION} personas; nunca se identifica a nadie.
        </p>
        <div className="mt-3 flex flex-wrap gap-1 text-[10px] font-mono text-muted-foreground">
          {Object.entries(SEGMENT_PRIORITIZATION_WEIGHTS).map(([k, v]) => (
            <span
              key={k}
              className="rounded-full border border-border bg-surface-raised px-2 py-0.5"
            >
              {factorLabel(k)}: {(v * 100).toFixed(0)}%
            </span>
          ))}
        </div>
      </header>

      {anyError ? (
        <p className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          No fue posible cargar las prioridades por grupo.
        </p>
      ) : null}

      {pendingDims.length > 0 ? (
        <p className="rounded-xl border border-border bg-surface-raised p-3 text-[11px] text-muted-foreground">
          Aún no disponibles:{" "}
          {pendingDims.map((d) => (DIMENSION_LABEL[d] ?? d).toLowerCase()).join(", ")}. Se activarán
          cuando las señales los incluyan.
        </p>
      ) : null}

      {loading || !result ? (
        <p className="h-6 w-48 animate-pulse rounded bg-muted" />
      ) : result.findings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface-raised p-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Todavía no hay grupos para priorizar</p>
          <p className="mt-1">
            Aparecerán aquí cuando haya grupos de al menos {result.min_population} personas.
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
                    "rounded-full px-2 py-1 text-center font-semibold " + FINDING_TYPE_META[t].badge
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

const BIAS_LABEL: Record<string, string> = { low: "bajo", medium: "medio", high: "alto" };

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
            <h3 className="text-sm font-semibold leading-snug">{f.segment_label}</h3>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {DIMENSION_LABEL[f.dimension] ?? f.dimension} · {f.sample_size} personas · avance{" "}
              {(f.jpr * 100).toFixed(1)}% vs promedio {(f.baseline_jpr * 100).toFixed(1)}% ·{" "}
              <strong className={f.delta_vs_baseline >= 0 ? "text-success" : "text-destructive"}>
                {f.delta_vs_baseline > 0 ? "+" : ""}
                {(f.delta_vs_baseline * 100).toFixed(1)} puntos
              </strong>
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 text-right">
          {f.type !== "insufficient_data" ? (
            <p className="text-2xl font-bold tracking-tight">{(f.score * 100).toFixed(0)}</p>
          ) : (
            <p className="text-xs uppercase tracking-wide text-muted-foreground">sin dato</p>
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
            riesgo de error: {BIAS_LABEL[f.bias_risk] ?? f.bias_risk}
          </span>
        </div>
      </header>

      <p className="mt-3 rounded-lg bg-surface p-2 text-xs italic text-foreground">{f.rationale}</p>

      <dl className="mt-3 grid gap-2 text-xs md:grid-cols-2">
        <div>
          <dt className="font-semibold">Qué hacer</dt>
          <dd className="text-muted-foreground">{f.recommended_action}</dd>
        </div>
        <div>
          <dt className="font-semibold">Impacto esperado</dt>
          <dd className="text-muted-foreground">{f.expected_impact}</dd>
        </div>
      </dl>

      <details className="mt-3">
        <summary className="cursor-pointer text-[11px] font-semibold text-primary hover:underline">
          Otras posibles explicaciones (revísalas antes de decidir)
        </summary>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-[11px] text-muted-foreground">
          {f.alternative_explanations.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      </details>

      {f.type !== "insufficient_data" ? (
        <>
          <details className="mt-2">
            <summary className="cursor-pointer text-[11px] font-semibold text-primary hover:underline">
              Ver por qué tiene esta prioridad
            </summary>
            <ul className="mt-2 space-y-1 text-[11px]">
              {f.factors.map((fac) => (
                <li
                  key={fac.key}
                  className="flex items-start justify-between gap-2 rounded-md bg-surface p-2"
                >
                  <div className="flex-1">
                    <p className="font-semibold">
                      {factorLabel(fac.key)} · pesa {(fac.weight * 100).toFixed(0)}% · obtuvo{" "}
                      {(fac.value * 100).toFixed(0)}%
                    </p>
                    <p className="text-muted-foreground">{fac.explanation}</p>
                  </div>
                  <span className="font-mono font-semibold text-primary">
                    +{(fac.contribution * 100).toFixed(1)} pts
                  </span>
                </li>
              ))}
            </ul>
          </details>
          <DecisionProposalButton
            source={decisionSourceFromSegmentFinding(f, {
              opportunity_id: `cv88:${f.dimension}:${f.segment_key}`,
            })}
          />
        </>
      ) : null}
    </li>
  );
}

function DecisionProposalButton({ source }: { source: DecisionSource | null }) {
  const accessCall = useServerFn(getDecisionActorAccess);
  const proposeCall = useServerFn(proposeDecision);
  const queryClient = useQueryClient();
  const access = useQuery({
    queryKey: ["cms", "visitor-intel", "decisions", "access"],
    queryFn: () => accessCall({ data: {} }),
    staleTime: 5 * 60_000,
    retry: false,
  });
  const proposal = useMutation({
    mutationFn: () => {
      if (!source) throw new Error("El hallazgo no produce una fuente accionable.");
      return proposeCall({ data: { source } });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["cms", "visitor-intel", "decisions"],
      });
      toast.success("Propuesta añadida a las decisiones del equipo.");
    },
    onError: () => toast.error("No fue posible registrar la propuesta."),
  });

  if (!source || !access.data?.manage_all) return null;
  return (
    <div className="mt-3 border-t border-border/60 pt-3">
      <button
        type="button"
        disabled={proposal.isPending}
        onClick={() => proposal.mutate()}
        className="rounded-full bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground disabled:opacity-50"
      >
        {proposal.isPending ? "Registrando…" : "Pasar a decisiones del equipo"}
      </button>
      <span className="ml-2 text-[10px] text-muted-foreground">
        Sólo crea una propuesta; no cambia nada del sitio.
      </span>
    </div>
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
            Seguimiento de recomendaciones
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight">
            ¿Nuestras recomendaciones funcionaron?
          </h2>
          <p className="mt-1 max-w-2xl text-xs text-muted-foreground">
            Sigue cada recomendación: detectada → aceptada → implementada → observada → validada o
            descartada. Con al menos <strong>{MIN_FAMILY_SIGNAL}</strong> resultados de un mismo
            tipo, aprende qué tan seguido acierta ese tipo de recomendación.
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
              {n} días
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
        No fue posible cargar el seguimiento de recomendaciones.
      </p>
    );
  }
  if (loading || !snapshot) return <p className="h-6 w-32 animate-pulse rounded bg-muted" />;
  if (!Array.isArray(snapshot.active) || !Array.isArray(snapshot.closed)) {
    return (
      <p className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
        No fue posible cargar el seguimiento de recomendaciones.
      </p>
    );
  }

  const total = snapshot.active.length + snapshot.closed.length;

  if (total === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface-raised p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Sin recomendaciones registradas</p>
        <p className="mt-1">
          Cuando el equipo marque una oportunidad como <em>aceptada</em>, aparecerá aquí y podrá
          recorrer su ciclo de vida completo hasta la validación.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {Object.entries(snapshot.totals).map(([status, count]) => (
          <div key={status} className="rounded-xl border border-border bg-surface-raised p-3">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {STATUS_STYLE[status]?.label ?? status}
            </p>
            <p className="mt-1 text-xl font-semibold">{count}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-semibold">En curso</h3>
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
          <h3 className="mb-2 text-sm font-semibold">Cerradas (lo que aprendimos)</h3>
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
          Qué tan seguido acierta cada tipo de recomendación
        </h3>
        {snapshot.family_confidence.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Aún no hay resultados. Se aprenderá al cerrar recomendaciones con cifras de antes y
            después.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-xs">
              <thead className="bg-surface-raised text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="p-2">Indicador</th>
                  <th className="p-2">Casos</th>
                  <th className="p-2">Validadas</th>
                  <th className="p-2">Descartadas</th>
                  <th className="p-2">Aciertos</th>
                  <th className="p-2">Qué tan confiable</th>
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
        Se actualiza con el historial de cada recomendación.
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
            {metricLabel(r.metric_id)} · {transitionLabel(r.transition)}
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
          Antes {r.latest_outcome.kpi_before.toFixed(3)} → después{" "}
          {r.latest_outcome.kpi_after.toFixed(3)} (
          {(r.latest_outcome.delta_relative * 100).toFixed(1)}%){" "}
          {r.latest_outcome.transition_advanced ? "· el paso mejoró" : ""}
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
      <td className="p-2 text-[11px]">{metricLabel(f.metric_id)}</td>
      <td className="p-2">{f.sample_size}</td>
      <td className="p-2 text-success">{f.validated}</td>
      <td className="p-2 text-destructive">{f.discarded}</td>
      <td className="p-2 font-semibold">{(f.learned_confidence * 100).toFixed(0)}%</td>
      <td className="p-2">
        <span
          className={
            "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide " + badge
          }
        >
          {reliabilityLabel(f.reliability)}
        </span>
      </td>
    </tr>
  );
}
