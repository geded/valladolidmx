/**
 * CV8.9.3 · Action Queue — governed operational surface.
 *
 * The page exposes only human decisions. Every mutation appends an audited
 * lifecycle event; no control here executes campaigns, content or Concierge.
 */
import { useMemo, useState, type ComponentProps, type FormEvent, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  attachEvidence,
  getDecisionActorAccess,
  getDecisionAssignableOwners,
  getDecisionQueue,
  proposeDecision,
  supersedeDecision,
  transitionDecision,
} from "@/lib/visitor-intel/decisions.functions";
import type { DecisionAssignableOwner } from "@/lib/visitor-intel/decisions.functions";
import {
  DECISION_BUCKET_LABELS,
  DECISION_ORIGIN_LABELS,
  DECISION_STATE_LABELS,
  availableDecisionTransitions,
  decisionSearchText,
} from "@/lib/visitor-intel/decision-workspace";
import {
  DECISION_QUEUE_BUCKETS,
  DECISION_STATES,
  type DecisionAgreement,
  type DecisionEvidence,
  type DecisionQueueBucket,
  type DecisionSource,
  type DecisionState,
  type ProjectedDecision,
} from "@/lib/visitor-intel/decisions";
import type { DecisionActorAccess } from "@/lib/visitor-intel/decision-operations";
import { projectDecisionWorkflowMetrics } from "@/lib/visitor-intel/decision-metrics";
import { JOURNEY_TRANSITIONS } from "@/lib/visitor-intel/journey";
import { KPI_CATALOG } from "@/lib/visitor-intel/kpis";

export const Route = createFileRoute("/_authenticated/cms/visitor-intel_/decisions")({
  head: () => ({
    meta: [
      { title: "Cola de decisiones · Visitor Intelligence · Valladolid.mx" },
      {
        name: "description",
        content: "Backlog humano y auditable de decisiones de Visitor Intelligence.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: DecisionWorkspace,
});

type TransitionTarget =
  | "accepted"
  | "in_progress"
  | "implemented"
  | "deferred"
  | "dismissed"
  | "blocked";

type WorkspaceOperation =
  | { kind: "propose"; source: DecisionSource }
  | {
      kind: "transition";
      decision_id: string;
      expected_from_state: DecisionState;
      to_state: TransitionTarget;
      agreement?: DecisionAgreement;
      reason?: string;
    }
  | {
      kind: "evidence";
      decision_id: string;
      outcome: "validated" | "rejected";
      evidence: DecisionEvidence;
      reason?: string;
    }
  | { kind: "supersede"; decision_id: string; source: DecisionSource };

const QUERY_KEY = ["cms", "visitor-intel", "decisions"] as const;
const FIELD_CLASS =
  "mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

function DecisionWorkspace() {
  const queueCall = useServerFn(getDecisionQueue);
  const accessCall = useServerFn(getDecisionActorAccess);
  const ownersCall = useServerFn(getDecisionAssignableOwners);
  const proposeCall = useServerFn(proposeDecision);
  const transitionCall = useServerFn(transitionDecision);
  const evidenceCall = useServerFn(attachEvidence);
  const supersedeCall = useServerFn(supersedeDecision);
  const queryClient = useQueryClient();
  const [bucket, setBucket] = useState<DecisionQueueBucket | "all">("today");
  const [state, setState] = useState<DecisionState | "all">("all");
  const [search, setSearch] = useState("");
  const [showProposal, setShowProposal] = useState(false);

  const queue = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => queueCall({ data: {} }),
    staleTime: 30_000,
  });
  const access = useQuery({
    queryKey: [...QUERY_KEY, "access"],
    queryFn: () => accessCall({ data: {} }),
    staleTime: 5 * 60_000,
  });
  const owners = useQuery({
    queryKey: [...QUERY_KEY, "owners"],
    queryFn: () => ownersCall({ data: {} }),
    enabled: access.data?.manage_all === true,
    staleTime: 5 * 60_000,
  });

  const operation = useMutation({
    mutationFn: async (request: WorkspaceOperation) => {
      switch (request.kind) {
        case "propose":
          return proposeCall({ data: { source: request.source } });
        case "transition":
          return transitionCall({
            data: {
              decision_id: request.decision_id,
              expected_from_state: request.expected_from_state,
              to_state: request.to_state,
              agreement: request.agreement,
              reason: request.reason,
            },
          });
        case "evidence":
          return evidenceCall({
            data: {
              decision_id: request.decision_id,
              expected_from_state: "implemented",
              outcome: request.outcome,
              evidence: request.evidence,
              reason: request.reason,
            },
          });
        case "supersede":
          return supersedeCall({
            data: { decision_id: request.decision_id, source: request.source },
          });
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Decisión registrada en la bitácora append-only.");
    },
    onError: (error) => toast.error(operationError(error)),
  });

  const visibleDecisions = useMemo(() => {
    if (!queue.data) return [];
    const bucketIds = bucket === "all" ? null : new Set(queue.data.queue_buckets[bucket]);
    const term = search.trim().toLocaleLowerCase("es-MX");
    return queue.data.decisions.filter(
      (decision) =>
        (!bucketIds || bucketIds.has(decision.decision_id)) &&
        (state === "all" || decision.current_state === state) &&
        (!term || decisionSearchText(decision).includes(term)),
    );
  }, [bucket, queue.data, search, state]);
  const workflowMetrics = useMemo(
    () =>
      queue.data
        ? projectDecisionWorkflowMetrics(queue.data, { now: new Date(queue.data.computed_at) })
        : null,
    [queue.data],
  );

  const loading = queue.isLoading || access.isLoading;
  const error = queue.error ?? access.error;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <header className="border-b border-border pb-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
              CV8.9.3 · Action Queue
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Cola de decisiones</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              Convierte inteligencia en compromisos humanos trazables. Nada aquí ejecuta
              automáticamente cambios sobre campañas, contenido, Alux o Concierge.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link to="/cms/visitor-intel" search={{}}>
                ← Centro de Inteligencia
              </Link>
            </Button>
            {access.data?.manage_all ? (
              <Button onClick={() => setShowProposal((value) => !value)}>
                {showProposal ? "Cerrar propuesta" : "Nueva decisión"}
              </Button>
            ) : null}
          </div>
        </div>
        {access.data ? <AccessBanner access={access.data} /> : null}
      </header>

      {showProposal && access.data?.manage_all ? (
        <ProposalForm
          pending={operation.isPending}
          onCancel={() => setShowProposal(false)}
          onSubmit={async (source) => {
            await operation.mutateAsync({ kind: "propose", source });
            setShowProposal(false);
            setBucket("today");
          }}
        />
      ) : null}

      {error ? (
        <ErrorPanel onRetry={() => void Promise.all([queue.refetch(), access.refetch()])} />
      ) : null}

      {!error ? (
        <>
          <QueueSummary
            bucket={bucket}
            counts={
              Object.fromEntries(
                DECISION_QUEUE_BUCKETS.map((key) => [
                  key,
                  queue.data?.queue_buckets[key].length ?? 0,
                ]),
              ) as Record<DecisionQueueBucket, number>
            }
            total={queue.data?.decisions.length ?? 0}
            feedback={queue.data?.feedback_to_cv86.length ?? 0}
            onBucket={setBucket}
          />
          {workflowMetrics ? <WorkflowMetrics metrics={workflowMetrics} /> : null}

          <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4">
            <label className="min-w-56 flex-1 text-xs font-medium text-muted-foreground">
              Buscar decisión, KPI, owner o acción
              <Input
                className="mt-1"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Ej. JPR_30D o nombre de acción"
              />
            </label>
            <label className="w-full text-xs font-medium text-muted-foreground sm:w-52">
              Estado
              <select
                className={FIELD_CLASS}
                value={state}
                onChange={(event) => setState(event.target.value as DecisionState | "all")}
              >
                <option value="all">Todos los estados</option>
                {DECISION_STATES.map((value) => (
                  <option key={value} value={value}>
                    {DECISION_STATE_LABELS[value]}
                  </option>
                ))}
              </select>
            </label>
            <Button
              variant="outline"
              disabled={queue.isFetching}
              onClick={() => void queue.refetch()}
            >
              {queue.isFetching ? "Actualizando…" : "Actualizar"}
            </Button>
          </div>

          {loading ? <QueueSkeleton /> : null}
          {!loading && queue.data && access.data && visibleDecisions.length === 0 ? (
            <EmptyQueue bucket={bucket} filtered={Boolean(search || state !== "all")} />
          ) : null}
          {!loading && access.data ? (
            <section className="space-y-3" aria-live="polite">
              {visibleDecisions.map((decision) => (
                <DecisionCard
                  key={decision.decision_id}
                  actor={access.data}
                  decision={decision}
                  owners={owners.data ?? []}
                  pending={operation.isPending}
                  slaFlags={(queue.data?.sla_flags ?? [])
                    .filter((entry) => entry.decision_id === decision.decision_id)
                    .map((entry) => entry.flag)}
                  feedsLearning={(queue.data?.feedback_to_cv86 ?? []).some(
                    (entry) => entry.decision_id === decision.decision_id,
                  )}
                  onOperation={(request) => operation.mutateAsync(request)}
                />
              ))}
            </section>
          ) : null}

          {queue.data?.issues.length ? (
            <details className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 text-sm">
              <summary className="cursor-pointer font-medium text-amber-800 dark:text-amber-200">
                {queue.data.issues.length} incidencia(s) de proyección auditables
              </summary>
              <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
                {queue.data.issues.map((issue, index) => (
                  <li key={`${issue.event_index}-${index}`}>
                    <strong>{issue.code}</strong> · {issue.message}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function WorkflowMetrics({
  metrics,
}: {
  metrics: ReturnType<typeof projectDecisionWorkflowMetrics>;
}) {
  const values = [
    ["Aceptación 7d", formatRate(metrics.acceptance_rate_7d)],
    ["Aceptación 30d", formatRate(metrics.acceptance_rate_30d)],
    ["Tiempo a aceptar p50", formatHours(metrics.time_to_accept_p50_hours)],
    ["Tiempo a implementar p50", formatHours(metrics.time_to_implement_p50_hours)],
    ["Validación", formatRate(metrics.validation_rate)],
    ["SLA vencido", formatRate(metrics.sla_breach_rate)],
  ];
  return (
    <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6" aria-label="Métricas CV8.9">
      {values.map(([label, value]) => (
        <div key={label} className="rounded-xl border border-border bg-card p-3">
          <p className="text-lg font-semibold">{value}</p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            {label}
          </p>
        </div>
      ))}
    </section>
  );
}

function AccessBanner({ access }: { access: DecisionActorAccess }) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <Badge variant="outline">
        {access.actor_role === "founder" ? "Founder" : access.actor_role}
      </Badge>
      <span>
        {access.manage_all
          ? "Puedes proponer, asignar, decidir y validar."
          : "Sólo ves decisiones asignadas a ti y puedes avanzar su ejecución."}
      </span>
    </div>
  );
}

function QueueSummary({
  bucket,
  counts,
  total,
  feedback,
  onBucket,
}: {
  bucket: DecisionQueueBucket | "all";
  counts: Record<DecisionQueueBucket, number>;
  total: number;
  feedback: number;
  onBucket: (bucket: DecisionQueueBucket | "all") => void;
}) {
  const tabs: Array<{ id: DecisionQueueBucket | "all"; label: string; count: number }> = [
    { id: "all", label: "Todas", count: total },
    ...DECISION_QUEUE_BUCKETS.map((id) => ({
      id,
      label: DECISION_BUCKET_LABELS[id],
      count: counts[id],
    })),
  ];
  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
      <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="Buckets de decisiones">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onBucket(tab.id)}
            aria-pressed={bucket === tab.id}
            className={`min-w-fit rounded-xl border px-4 py-3 text-left transition-colors ${
              bucket === tab.id
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border bg-card text-muted-foreground hover:bg-accent/40"
            }`}
          >
            <span className="block text-lg font-semibold">{tab.count}</span>
            <span className="text-xs">{tab.label}</span>
          </button>
        ))}
      </nav>
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm">
        <strong>{feedback}</strong>
        <span className="ml-2 text-xs text-muted-foreground">señales listas para CV8.6</span>
      </div>
    </div>
  );
}

function DecisionCard({
  actor,
  decision,
  owners,
  pending,
  slaFlags,
  feedsLearning,
  onOperation,
}: {
  actor: DecisionActorAccess;
  decision: ProjectedDecision;
  owners: DecisionAssignableOwner[];
  pending: boolean;
  slaFlags: string[];
  feedsLearning: boolean;
  onOperation: (request: WorkspaceOperation) => Promise<unknown>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [composer, setComposer] = useState<DecisionState | "evidence" | null>(null);
  const targets = availableDecisionTransitions(actor, decision).filter(
    (target): target is TransitionTarget => target !== "validated" && target !== "rejected",
  );
  const owner = owners.find((candidate) => candidate.user_id === decision.agreement?.owner_user_id);

  const run = async (request: WorkspaceOperation) => {
    await onOperation(request);
    setComposer(null);
  };

  return (
    <article className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{DECISION_ORIGIN_LABELS[decision.source.origin]}</Badge>
            <Badge variant="outline">{DECISION_STATE_LABELS[decision.current_state]}</Badge>
            {decision.source.segment ? (
              <Badge variant="outline">
                {decision.source.segment.dimension}: {decision.source.segment.value}
              </Badge>
            ) : null}
            {feedsLearning ? <Badge className="bg-emerald-600 text-white">→ CV8.6</Badge> : null}
          </div>
          <h2 className="mt-3 text-lg font-semibold">
            {decision.agreement?.action ?? `Evaluar oportunidad ${decision.source.metric_id}`}
          </h2>
          <p className="mt-1 font-mono text-[11px] text-muted-foreground">{decision.decision_id}</p>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <p>Actualizada</p>
          <time dateTime={decision.last_updated_at}>
            {formatDateTime(decision.last_updated_at)}
          </time>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Datum label="KPI origen" value={decision.source.metric_id} />
        <Datum label="Transición" value={decision.source.transition} />
        <Datum label="Prioridad" value={formatPercent(decision.source.priority_score)} />
        <Datum
          label="Confianza aprendida"
          value={formatPercent(decision.source.learned_confidence)}
        />
      </div>

      {decision.agreement ? (
        <div className="mt-4 grid gap-3 rounded-xl bg-muted/40 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <Datum
            label="Responsable"
            value={owner?.display_name ?? shortId(decision.agreement.owner_user_id)}
            mono={!owner?.display_name}
          />
          <Datum label="KPI esperado" value={decision.agreement.expected_kpi_id} />
          <Datum
            label="Movimiento esperado"
            value={`${decision.agreement.expected_direction === "up" ? "↑" : "↓"} ${formatPercent(decision.agreement.expected_delta_relative)}`}
          />
          <Datum
            label="Ventana / fecha objetivo"
            value={`${decision.agreement.evaluation_window_days}d · ${decision.agreement.due_at ? formatDate(decision.agreement.due_at) : "sin fecha"}`}
          />
        </div>
      ) : null}

      {slaFlags.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {slaFlags.map((flag) => (
            <Badge key={flag} variant="destructive">
              {slaLabel(flag)}
            </Badge>
          ))}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
        {targets.map((target) => {
          const needsForm =
            target === "accepted" || ["deferred", "dismissed", "blocked"].includes(target);
          return (
            <Button
              key={target}
              size="sm"
              variant={target === "accepted" || target === "implemented" ? "default" : "outline"}
              disabled={pending}
              onClick={() => {
                if (needsForm) setComposer(target);
                else
                  void run({
                    kind: "transition",
                    decision_id: decision.decision_id,
                    expected_from_state: decision.current_state,
                    to_state: target,
                  });
              }}
            >
              {actionLabel(target)}
            </Button>
          );
        })}
        {actor.manage_all &&
        decision.current_state === "implemented" &&
        !decision.superseded_by_decision_id ? (
          <Button size="sm" disabled={pending} onClick={() => setComposer("evidence")}>
            Validar resultado
          </Button>
        ) : null}
        {actor.manage_all && !decision.superseded_by_decision_id ? (
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => {
              if (!window.confirm("¿Crear una nueva decisión que reemplace esta versión?")) return;
              void run({
                kind: "supersede",
                decision_id: decision.decision_id,
                source: decision.source,
              });
            }}
          >
            Crear corrección
          </Button>
        ) : null}
        <Button size="sm" variant="ghost" onClick={() => setExpanded((value) => !value)}>
          {expanded ? "Ocultar detalle" : "Ver detalle e historial"}
        </Button>
      </div>

      {composer === "accepted" ? (
        <AgreementForm
          actor={actor}
          decision={decision}
          owners={owners}
          pending={pending}
          onCancel={() => setComposer(null)}
          onSubmit={(agreement) =>
            run({
              kind: "transition",
              decision_id: decision.decision_id,
              expected_from_state: decision.current_state,
              to_state: "accepted",
              agreement,
            })
          }
        />
      ) : null}
      {composer && ["deferred", "dismissed", "blocked"].includes(composer) ? (
        <ReasonForm
          target={composer as "deferred" | "dismissed" | "blocked"}
          pending={pending}
          onCancel={() => setComposer(null)}
          onSubmit={(reason) =>
            run({
              kind: "transition",
              decision_id: decision.decision_id,
              expected_from_state: decision.current_state,
              to_state: composer as "deferred" | "dismissed" | "blocked",
              reason,
            })
          }
        />
      ) : null}
      {composer === "evidence" ? (
        <EvidenceForm
          decision={decision}
          pending={pending}
          onCancel={() => setComposer(null)}
          onSubmit={(outcome, evidence, reason) =>
            run({
              kind: "evidence",
              decision_id: decision.decision_id,
              outcome,
              evidence,
              reason,
            })
          }
        />
      ) : null}

      {expanded ? <DecisionDetail decision={decision} /> : null}
    </article>
  );
}

function ProposalForm({
  pending,
  onCancel,
  onSubmit,
}: {
  pending: boolean;
  onCancel: () => void;
  onSubmit: (source: DecisionSource) => Promise<void>;
}) {
  const [metric, setMetric] = useState("JPR_30D");
  const [transition, setTransition] = useState("aggregate");
  const [opportunity, setOpportunity] = useState("");
  const [segmentDimension, setSegmentDimension] = useState("");
  const [segmentValue, setSegmentValue] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void onSubmit({
      origin: "manual",
      metric_id: metric,
      transition: transition as DecisionSource["transition"],
      opportunity_id: opportunity.trim() || undefined,
      segment:
        segmentDimension && segmentValue.trim()
          ? {
              dimension: segmentDimension as "locale" | "destination" | "capability",
              value: segmentValue.trim(),
            }
          : undefined,
    });
  };

  return (
    <form onSubmit={submit} className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
      <h2 className="text-lg font-semibold">Proponer una decisión manual</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Esto crea sólo una propuesta auditable. La acción y el responsable se acuerdan al aceptarla.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <SelectField label="Métrica observada" value={metric} onChange={setMetric}>
          {KPI_CATALOG.map((kpi) => (
            <option key={kpi.id} value={kpi.id}>
              {kpi.id}
            </option>
          ))}
        </SelectField>
        <SelectField label="Transición del Journey" value={transition} onChange={setTransition}>
          <option value="aggregate">aggregate</option>
          {Object.keys(JOURNEY_TRANSITIONS).map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </SelectField>
        <TextField
          label="ID de oportunidad (opcional)"
          value={opportunity}
          onChange={setOpportunity}
        />
        <SelectField
          label="Segmento (opcional)"
          value={segmentDimension}
          onChange={setSegmentDimension}
        >
          <option value="">Sin segmento</option>
          <option value="locale">Idioma</option>
          <option value="destination">Destino</option>
          <option value="capability">Capability</option>
        </SelectField>
        <TextField
          label="Valor del segmento"
          value={segmentValue}
          onChange={setSegmentValue}
          disabled={!segmentDimension}
        />
      </div>
      <div className="mt-4 flex gap-2">
        <Button
          type="submit"
          disabled={pending || Boolean(segmentDimension && !segmentValue.trim())}
        >
          {pending ? "Registrando…" : "Registrar propuesta"}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

function AgreementForm({
  actor,
  decision,
  owners,
  pending,
  onCancel,
  onSubmit,
}: {
  actor: DecisionActorAccess;
  decision: ProjectedDecision;
  owners: DecisionAssignableOwner[];
  pending: boolean;
  onCancel: () => void;
  onSubmit: (agreement: DecisionAgreement) => Promise<unknown>;
}) {
  const defaultKpi = KPI_CATALOG.some((kpi) => kpi.id === decision.source.metric_id)
    ? decision.source.metric_id
    : "JPR_30D";
  const [action, setAction] = useState("");
  const [rationale, setRationale] = useState("");
  const [owner, setOwner] = useState(actor.user_id);
  const [kpi, setKpi] = useState(defaultKpi);
  const [direction, setDirection] = useState<"up" | "down">("up");
  const [magnitude, setMagnitude] = useState("5");
  const [windowDays, setWindowDays] = useState("30");
  const [dueAt, setDueAt] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void onSubmit({
      action: action.trim(),
      rationale: rationale.trim(),
      owner_user_id: owner.trim(),
      expected_kpi_id: kpi,
      expected_direction: direction,
      expected_delta_relative: Number(magnitude) / 100,
      evaluation_window_days: Number(windowDays),
      due_at: dueAt ? new Date(`${dueAt}T23:59:59`).toISOString() : undefined,
    });
  };

  return (
    <form onSubmit={submit} className="mt-4 rounded-xl border border-primary/30 bg-background p-4">
      <h3 className="font-semibold">Acuerdo humano obligatorio</h3>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <label className="text-xs font-medium text-muted-foreground md:col-span-2">
          Acción acordada
          <Textarea
            required
            maxLength={2000}
            className="mt-1"
            value={action}
            onChange={(e) => setAction(e.target.value)}
          />
        </label>
        <label className="text-xs font-medium text-muted-foreground md:col-span-2">
          Motivo humano
          <Textarea
            required
            maxLength={2000}
            className="mt-1"
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
          />
        </label>
        {owners.length ? (
          <SelectField label="Responsable" value={owner} onChange={setOwner}>
            {owners.map((candidate) => (
              <option key={candidate.user_id} value={candidate.user_id}>
                {candidate.display_name ?? shortId(candidate.user_id)} · {candidate.role}
              </option>
            ))}
          </SelectField>
        ) : (
          <TextField label="UUID del responsable" value={owner} onChange={setOwner} required />
        )}
        <SelectField label="KPI esperado" value={kpi} onChange={setKpi}>
          {KPI_CATALOG.map((item) => (
            <option key={item.id} value={item.id}>
              {item.id}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Dirección esperada"
          value={direction}
          onChange={(value) => setDirection(value as "up" | "down")}
        >
          <option value="up">Subir</option>
          <option value="down">Bajar</option>
        </SelectField>
        <TextField
          label="Magnitud esperada (%)"
          value={magnitude}
          onChange={setMagnitude}
          type="number"
          min="0"
          max="100"
          step="0.1"
          required
        />
        <TextField
          label="Ventana de evaluación (días)"
          value={windowDays}
          onChange={setWindowDays}
          type="number"
          min="1"
          max="3650"
          required
        />
        <TextField
          label="Fecha objetivo (opcional)"
          value={dueAt}
          onChange={setDueAt}
          type="date"
        />
      </div>
      <FormActions pending={pending} submit="Aceptar y asignar" onCancel={onCancel} />
    </form>
  );
}

function ReasonForm({
  target,
  pending,
  onCancel,
  onSubmit,
}: {
  target: "deferred" | "dismissed" | "blocked";
  pending: boolean;
  onCancel: () => void;
  onSubmit: (reason: string) => Promise<unknown>;
}) {
  const [reason, setReason] = useState("");
  return (
    <form
      className="mt-4 rounded-xl border border-border bg-background p-4"
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit(reason.trim());
      }}
    >
      <label className="text-xs font-medium text-muted-foreground">
        Motivo para marcar como {DECISION_STATE_LABELS[target].toLocaleLowerCase("es-MX")}
        <Textarea
          required
          maxLength={2000}
          className="mt-1"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </label>
      <FormActions pending={pending} submit="Registrar transición" onCancel={onCancel} />
    </form>
  );
}

function EvidenceForm({
  decision,
  pending,
  onCancel,
  onSubmit,
}: {
  decision: ProjectedDecision;
  pending: boolean;
  onCancel: () => void;
  onSubmit: (
    outcome: "validated" | "rejected",
    evidence: DecisionEvidence,
    reason?: string,
  ) => Promise<unknown>;
}) {
  const [outcome, setOutcome] = useState<"validated" | "rejected">("validated");
  const [metric, setMetric] = useState(decision.agreement?.expected_kpi_id ?? "JPR_30D");
  const [delta, setDelta] = useState("0");
  const [sample, setSample] = useState("0");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [reason, setReason] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void onSubmit(
      outcome,
      {
        metric_id: metric,
        observed_delta_relative: Number(delta) / 100,
        sample_size: Number(sample),
        window_start: new Date(`${start}T00:00:00`).toISOString(),
        window_end: new Date(`${end}T23:59:59`).toISOString(),
      },
      outcome === "rejected" ? reason.trim() : undefined,
    );
  };

  return (
    <form
      onSubmit={submit}
      className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4"
    >
      <h3 className="font-semibold">Evidencia observable</h3>
      <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <SelectField
          label="Resultado"
          value={outcome}
          onChange={(value) => setOutcome(value as "validated" | "rejected")}
        >
          <option value="validated">Validada</option>
          <option value="rejected">Rechazada</option>
        </SelectField>
        <SelectField label="KPI observado" value={metric} onChange={setMetric}>
          {KPI_CATALOG.map((item) => (
            <option key={item.id} value={item.id}>
              {item.id}
            </option>
          ))}
        </SelectField>
        <TextField
          label="Cambio observado (%)"
          value={delta}
          onChange={setDelta}
          type="number"
          step="0.1"
          required
        />
        <TextField
          label="Tamaño de muestra"
          value={sample}
          onChange={setSample}
          type="number"
          min="0"
          step="1"
          required
        />
        <TextField
          label="Inicio de ventana"
          value={start}
          onChange={setStart}
          type="date"
          required
        />
        <TextField label="Fin de ventana" value={end} onChange={setEnd} type="date" required />
        {outcome === "rejected" ? (
          <label className="text-xs font-medium text-muted-foreground md:col-span-2 lg:col-span-3">
            Motivo del rechazo
            <Textarea
              required
              maxLength={2000}
              className="mt-1"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
        ) : null}
      </div>
      <FormActions pending={pending} submit="Registrar evidencia" onCancel={onCancel} />
    </form>
  );
}

function DecisionDetail({ decision }: { decision: ProjectedDecision }) {
  return (
    <div className="mt-4 grid gap-4 border-t border-border pt-4 lg:grid-cols-2">
      <div className="space-y-3 text-sm">
        <h3 className="font-semibold">Explicación</h3>
        <Datum
          label="Rationale"
          value={decision.agreement?.rationale ?? "Pendiente de aceptación"}
        />
        <Datum label="Motivo del último estado" value={decision.reason ?? "—"} />
        {decision.evidence ? (
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs font-medium text-muted-foreground">Evidencia</p>
            <p className="mt-1">
              {decision.evidence.metric_id}:{" "}
              {formatPercent(decision.evidence.observed_delta_relative)} · muestra{" "}
              {decision.evidence.sample_size}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatDate(decision.evidence.window_start)} →{" "}
              {formatDate(decision.evidence.window_end)}
            </p>
          </div>
        ) : null}
        {decision.supersedes_decision_id ? (
          <Datum label="Reemplaza" value={decision.supersedes_decision_id} mono />
        ) : null}
        {decision.superseded_by_decision_id ? (
          <Datum label="Reemplazada por" value={decision.superseded_by_decision_id} mono />
        ) : null}
      </div>
      <div>
        <h3 className="font-semibold">Historial append-only</h3>
        <ol className="mt-3 space-y-3 border-l border-border pl-4">
          {decision.history.map((entry, index) => (
            <li
              key={`${entry.event.occurred_at}-${index}`}
              className={entry.applied ? "" : "opacity-60"}
            >
              <p className="text-sm font-medium">
                {entry.event.from_state
                  ? `${DECISION_STATE_LABELS[entry.event.from_state]} → `
                  : ""}
                {DECISION_STATE_LABELS[entry.event.to_state]}
                {!entry.applied ? " · no aplicada" : ""}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {entry.event.actor_role} · {shortId(entry.event.actor_user_id)} ·{" "}
                {formatDateTime(entry.event.occurred_at)}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  ...props
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
} & Omit<ComponentProps<typeof Input>, "value" | "onChange">) {
  return (
    <label className="text-xs font-medium text-muted-foreground">
      {label}
      <Input
        className="mt-1"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        {...props}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="text-xs font-medium text-muted-foreground">
      {label}
      <select
        className={FIELD_CLASS}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {children}
      </select>
    </label>
  );
}

function FormActions({
  pending,
  submit,
  onCancel,
}: {
  pending: boolean;
  submit: string;
  onCancel: () => void;
}) {
  return (
    <div className="mt-4 flex gap-2">
      <Button type="submit" disabled={pending}>
        {pending ? "Registrando…" : submit}
      </Button>
      <Button type="button" variant="ghost" onClick={onCancel}>
        Cancelar
      </Button>
    </div>
  );
}

function Datum({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className={`mt-1 break-words text-sm ${mono ? "font-mono text-xs" : ""}`}>{value}</p>
    </div>
  );
}

function QueueSkeleton() {
  return (
    <div className="space-y-3" aria-label="Cargando decisiones">
      {[0, 1, 2].map((item) => (
        <div key={item} className="h-44 animate-pulse rounded-2xl bg-muted" />
      ))}
    </div>
  );
}

function EmptyQueue({
  bucket,
  filtered,
}: {
  bucket: DecisionQueueBucket | "all";
  filtered: boolean;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/40 px-6 py-12 text-center">
      <h2 className="text-lg font-semibold">No hay decisiones en esta vista</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
        {filtered
          ? "Quita el filtro o cambia el estado para ampliar la búsqueda."
          : bucket === "today"
            ? "La cola de hoy está limpia. Founder/Admin puede registrar una propuesta cuando exista una oportunidad accionable."
            : "Este bucket no contiene decisiones actualmente."}
      </p>
    </div>
  );
}

function ErrorPanel({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
      <p className="font-medium">No fue posible cargar la cola de decisiones.</p>
      <p className="mt-1 text-xs">
        Verifica la sesión y que tu rol sea Founder, Admin, Concierge Lead o Editor.
      </p>
      <Button className="mt-3" size="sm" variant="outline" onClick={onRetry}>
        Reintentar
      </Button>
    </div>
  );
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(new Date(value));
}

function formatPercent(value: number | undefined): string {
  return value === undefined ? "—" : `${(value * 100).toFixed(1)}%`;
}

function formatRate(metric: { value: number | null }): string {
  return metric.value === null ? "—" : `${(metric.value * 100).toFixed(1)}%`;
}

function formatHours(value: number | null): string {
  return value === null ? "—" : `${value.toFixed(1)} h`;
}

function shortId(value: string): string {
  return value.length > 18 ? `${value.slice(0, 8)}…${value.slice(-6)}` : value;
}

function actionLabel(state: TransitionTarget): string {
  const labels: Record<TransitionTarget, string> = {
    accepted: "Aceptar y asignar",
    in_progress: "Iniciar trabajo",
    implemented: "Marcar implementada",
    deferred: "Posponer",
    dismissed: "Descartar",
    blocked: "Registrar bloqueo",
  };
  return labels[state];
}

function slaLabel(flag: string): string {
  return (
    (
      {
        no_owner: "Sin responsable",
        no_kpi: "Sin KPI",
        overdue_due_at: "Fecha objetivo vencida",
        validation_window_expired: "Validación vencida",
      } as Record<string, string>
    )[flag] ?? flag
  );
}

function operationError(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "La operación no pudo registrarse. Actualiza la cola y vuelve a intentarlo.";
}
