/**
 * /concierge — Centro de seguimiento de expedientes.
 *
 * Bandejas derivadas del ciclo oficial (14.60.x / 15.10.4): no se crean
 * estados, tablas ni folios nuevos. La lista procede de
 * `concierge_case_list_for_role` y el seguimiento agregado de
 * `getConciergeCasesFollowUp` (cotizaciones, última propuesta, responsable).
 */
import { createFileRoute, ErrorComponent, Link } from "@tanstack/react-router";
import { meridaDate, meridaDateTime } from "@/lib/time/merida";
import { useSuspenseQuery, queryOptions, useQueryClient, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";

/** Bandeja recordada entre recargas y tamaño de página del listado. */
const INBOX_STORAGE_KEY = "vmx.concierge.inbox";
const PAGE_SIZE = 50;

/** Contador del tablero: un clic lleva a su bandeja. */
function Kpi({
  label,
  value,
  tone = "neutral",
  onClick,
}: {
  label: string;
  value: number;
  tone?: "neutral" | "warning" | "danger" | "success";
  onClick: () => void;
}) {
  const toneClass =
    tone === "danger"
      ? "text-destructive"
      : tone === "warning"
        ? "text-warning"
        : tone === "success"
          ? "text-success"
          : "text-foreground";
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md border border-border bg-card p-3 text-left shadow-soft transition hover:border-primary/50 focus-visible:ring-focus"
    >
      <span className={`block text-2xl font-semibold tabular-nums ${toneClass}`}>{value}</span>
      <span className="mt-0.5 block text-[11px] leading-tight text-muted-foreground">{label}</span>
    </button>
  );
}
import {
  assignSelfConciergeCase,
  assignConciergeCase,
  reassignConciergeCase,
  releaseConciergeCase,
  listConciergeCasesExtended,
  listConciergeDirectory,
  getConciergeCasesFollowUp,
  getConciergeMyWorkload,
} from "@/lib/concierge/concierge.functions";
import {
  CONCIERGE_INBOXES,
  caseReference,
  deriveCaseStage,
  deriveTripPhase,
  type CaseFollowUp,
  type CaseStage,
  type TripPhase,
} from "@/lib/concierge/case-stage";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { useAuth } from "@/hooks/useAuth";

type Sort =
  | "updated_at"
  | "priority"
  | "sla_status"
  | "idle"
  | "created_at"
  | "trip_date"
  | "assigned_concierge";

type CaseRow = {
  id: string;
  status: string;
  priority: string;
  source: string;
  summary: string | null;
  created_at: string;
  updated_at: string;
  last_activity_at: string | null;
  target_response_at: string | null;
  sla_status: "on_time" | "due_soon" | "overdue" | null;
  assigned_concierge_user_id: string | null;
};

type DirectoryEntry = { user_id: string; display_name: string | null; active: boolean };

const LEAD_ROLES = ["super_admin", "admin", "concierge_lead"];

const PRIORITY_LABEL: Record<string, string> = {
  urgent: "Urgente",
  high: "Alta",
  normal: "Normal",
  low: "Baja",
};

const SLA_LABEL: Record<string, string> = {
  overdue: "Vencido",
  due_soon: "Por vencer",
  on_time: "En tiempo",
};

export const Route = createFileRoute("/_authenticated/concierge/")({
  component: ConciergeInboxPage,
  errorComponent: ErrorComponent,
  notFoundComponent: () => <div className="p-6">No encontrado.</div>,
  head: () => ({
    meta: [
      { title: "Concierge · Seguimiento de expedientes · Valladolid.mx" },
      {
        name: "description",
        content: "Bandejas de seguimiento del Centro Concierge de Valladolid.mx.",
      },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

function ConciergeInboxPage() {
  const { roles, user } = useAuth();
  const isLead = useMemo(() => roles.some((r) => LEAD_ROLES.includes(r)), [roles]);

  const [inboxId, setInboxId] = useState<string>("unassigned");
  // La bandeja de trabajo se recuerda entre recargas (se hidrata tras montar).
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(INBOX_STORAGE_KEY);
      if (stored) setInboxId(stored);
    } catch {
      /* almacenamiento no disponible */
    }
  }, []);
  const [page, setPage] = useState(1);
  const goInbox = (id: string) => {
    setInboxId(id);
    setPage(1);
    try {
      window.localStorage.setItem(INBOX_STORAGE_KEY, id);
    } catch {
      /* almacenamiento no disponible */
    }
  };
  const [sort, setSort] = useState<Sort>("sla_status");
  const [priority, setPriority] = useState<string>("");
  const [slaStatus, setSlaStatus] = useState<string>("");
  const [owner, setOwner] = useState<string>("");
  const [search, setSearch] = useState<string>("");

  const listFn = useServerFn(listConciergeCasesExtended);
  const workloadFn = useServerFn(getConciergeMyWorkload);
  const followUpFn = useServerFn(getConciergeCasesFollowUp);
  const directoryFn = useServerFn(listConciergeDirectory);

  const filters = {
    sort,
    limit: 100,
    ...(priority ? { priority: [priority as "low" | "normal" | "high" | "urgent"] } : {}),
    ...(slaStatus ? { slaStatus: [slaStatus as "on_time" | "due_soon" | "overdue"] } : {}),
  };

  // Una sola carga alimenta todas las bandejas y sus contadores.
  const broadScope = isLead ? ("lead" as const) : ("concierge" as const);
  const broadQ = useSuspenseQuery(
    queryOptions({
      queryKey: ["concierge", "cases-ext", broadScope, sort, priority, slaStatus],
      queryFn: () => listFn({ data: { scope: broadScope, ...filters } }) as Promise<CaseRow[]>,
    }),
  );
  const unassignedQ = useSuspenseQuery(
    queryOptions({
      queryKey: ["concierge", "cases-ext", "unassigned", sort, priority, slaStatus],
      queryFn: () => listFn({ data: { scope: "unassigned", ...filters } }) as Promise<CaseRow[]>,
    }),
  );
  const wlQ = useSuspenseQuery(
    queryOptions({
      queryKey: ["concierge", "my-workload"],
      queryFn: () =>
        workloadFn() as Promise<{ active_cases: number; overdue: number; due_soon: number } | null>,
    }),
  );

  const allCases = useMemo(() => {
    const map = new Map<string, CaseRow>();
    for (const c of [...unassignedQ.data, ...broadQ.data]) map.set(c.id, c);
    return Array.from(map.values());
  }, [broadQ.data, unassignedQ.data]);

  const caseIds = useMemo(() => allCases.map((c) => c.id).sort(), [allCases]);

  const followUpQ = useQuery({
    queryKey: ["concierge", "follow-up", caseIds],
    enabled: caseIds.length > 0,
    queryFn: () => followUpFn({ data: { caseIds } }) as Promise<CaseFollowUp[]>,
  });

  const directoryQ = useQuery({
    queryKey: ["concierge", "directory"],
    queryFn: () => directoryFn() as Promise<DirectoryEntry[]>,
  });

  const followUpById = useMemo(() => {
    const map = new Map<string, CaseFollowUp>();
    for (const f of followUpQ.data ?? []) map.set(f.case_id, f);
    return map;
  }, [followUpQ.data]);

  const enriched = useMemo(
    () =>
      allCases.map((c) => {
        const followUp = followUpById.get(c.id) ?? null;
        const ownerId = followUp?.assigned_concierge_user_id ?? c.assigned_concierge_user_id;
        const stage = deriveCaseStage({
          status: c.status,
          assigned_concierge_user_id: ownerId,
          followUp,
        });
        return {
          row: c,
          followUp,
          ownerId,
          ownerName: followUp?.assigned_concierge_name ?? null,
          stage,
          phase: deriveTripPhase({ status: c.status, stage, followUp }),
          pendingQuestionSince: followUp?.pending_question_since ?? null,
        };
      }),
    [allCases, followUpById],
  );

  // "Todo el equipo" sólo tiene sentido para quien supervisa la operación.
  const visibleInboxes = useMemo(
    () => CONCIERGE_INBOXES.filter((i) => (i.id === "all" ? isLead : true)),
    [isLead],
  );

  const byInbox = useMemo(() => {
    const result = new Map<string, typeof enriched>();
    for (const inbox of visibleInboxes) {
      result.set(
        inbox.id,
        enriched.filter((item) => {
          if (inbox.id === "unassigned") return !item.ownerId;
          if (inbox.id === "mine") {
            if (!user || item.ownerId !== user.id) return false;
            return inbox.stages.includes(item.stage.id);
          }
          if (inbox.pendingQuestion && !item.pendingQuestionSince) return false;
          if (inbox.phases && inbox.phases.length > 0) {
            return inbox.phases.includes(item.phase.id);
          }
          if (inbox.stages.length === 0) return true;
          return inbox.stages.includes(item.stage.id);
        }),
      );
    }
    return result;
  }, [enriched, user, visibleInboxes]);

  const term = search.trim().toLowerCase();
  const filtered = (byInbox.get(inboxId) ?? []).filter((item) => {
    if (owner && item.ownerId !== owner) return false;
    if (!term) return true;
    return (
      item.row.id.toLowerCase().includes(term) ||
      (item.row.summary ?? "").toLowerCase().includes(term) ||
      (item.ownerName ?? "").toLowerCase().includes(term)
    );
  });

  // En la bandeja de preguntas manda la antigüedad: primero quien lleva más esperando.
  const ordered =
    inboxId === "questions"
      ? [...filtered].sort((a, b) =>
          (a.pendingQuestionSince ?? "").localeCompare(b.pendingQuestionSince ?? ""),
        )
      : filtered;

  const totalPages = Math.max(1, Math.ceil(ordered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const items = ordered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const countOf = (id: string) => (byInbox.get(id) ?? []).length;
  const overdueCount = enriched.filter((i) => i.row.sla_status === "overdue").length;

  const groups = ["Venta", "Pago", "Viaje", "Cierre"] as const;

  return (
    <section className="mx-auto w-full max-w-[1100px]">
      <header className="mb-4">
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Concierge Workspace
        </p>
        <h1 className="mt-1 text-2xl font-semibold">Central de operaciones</h1>
        {wlQ.data && (
          <p className="mt-1 text-sm text-muted-foreground">
            Activos: <strong className="text-foreground">{wlQ.data.active_cases}</strong>
            {" · "}Vencidos: <strong className="text-destructive">{wlQ.data.overdue}</strong>
            {" · "}Por vencer: <strong className="text-warning">{wlQ.data.due_soon}</strong>
          </p>
        )}
      </header>

      {/* Tablero: cada contador es un atajo a su bandeja. */}
      <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi
          label="Sin asignar"
          value={countOf("unassigned")}
          onClick={() => goInbox("unassigned")}
        />
        <Kpi
          label="Preguntas sin responder"
          value={countOf("questions")}
          tone="danger"
          onClick={() => goInbox("questions")}
        />
        <Kpi
          label="Por pagar"
          value={countOf("awaiting_payment")}
          tone="warning"
          onClick={() => goInbox("awaiting_payment")}
        />
        <Kpi
          label="Propuestas sin respuesta"
          value={countOf("sent")}
          onClick={() => goInbox("sent")}
        />
        <Kpi
          label="Viaja esta semana"
          value={countOf("departing_soon")}
          tone="warning"
          onClick={() => goInbox("departing_soon")}
        />
        <Kpi
          label="En destino hoy"
          value={countOf("on_trip")}
          tone="success"
          onClick={() => goInbox("on_trip")}
        />
      </div>

      <nav className="mb-4 grid gap-2" aria-label="Bandejas">
        {groups.map((group) => {
          const inGroup = visibleInboxes.filter((i) => i.group === group);
          if (inGroup.length === 0) return null;
          return (
            <div key={group} className="flex flex-wrap items-center gap-2">
              <span className="w-14 shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
                {group}
              </span>
              {inGroup.map((inbox) => (
                <Tab
                  key={inbox.id}
                  active={inboxId === inbox.id}
                  label={inbox.label}
                  count={countOf(inbox.id)}
                  onClick={() => goInbox(inbox.id)}
                />
              ))}
            </div>
          );
        })}
      </nav>

      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-md border border-border bg-card/40 p-3 text-xs">
        <label className="flex min-w-[200px] flex-1 flex-col gap-1">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Buscar</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Número de expediente, resumen o responsable"
            className="rounded-md border border-border bg-background px-2 py-1 text-xs"
          />
        </label>
        <Select
          label="Responsable"
          value={owner}
          onChange={setOwner}
          options={[
            ["", "Todos"] as const,
            ...((directoryQ.data ?? []).map(
              (d) => [d.user_id, d.display_name ?? d.user_id.slice(0, 8)] as const,
            ) as ReadonlyArray<readonly [string, string]>),
          ]}
        />
        <Select
          label="Ordenar"
          value={sort}
          onChange={(v) => setSort(v as Sort)}
          options={[
            ["sla_status", "SLA"],
            ["priority", "Prioridad"],
            ["idle", "Tiempo sin actividad"],
            ["created_at", "Fecha de creación"],
            ["trip_date", "Fecha de viaje"],
            ["assigned_concierge", "Concierge asignado"],
            ["updated_at", "Última actualización"],
          ]}
        />
        <Select
          label="Prioridad"
          value={priority}
          onChange={setPriority}
          options={[
            ["", "Todas"],
            ["urgent", "Urgente"],
            ["high", "Alta"],
            ["normal", "Normal"],
            ["low", "Baja"],
          ]}
        />
        <Select
          label="SLA"
          value={slaStatus}
          onChange={setSlaStatus}
          options={[
            ["", "Todos"],
            ["overdue", "Vencidos"],
            ["due_soon", "Por vencer"],
            ["on_time", "En tiempo"],
          ]}
        />
      </div>

      {items.length === 0 ? (
        <p className="mt-3 rounded-md border border-dashed border-border bg-card/40 p-4 text-sm text-muted-foreground">
          No hay expedientes en esta bandeja.
        </p>
      ) : (
        <ul className="mt-3 grid gap-2">
          {items.map((item) => (
            <CaseRowCard
              key={item.row.id}
              caseRow={item.row}
              stage={item.stage}
              followUp={item.followUp}
              ownerId={item.ownerId}
              ownerName={item.ownerName}
              phase={item.phase}
              pendingQuestionSince={item.pendingQuestionSince}
              directory={directoryQ.data ?? []}
              isLead={isLead}
            />
          ))}
        </ul>
      )}

      {ordered.length > PAGE_SIZE ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            Mostrando {(currentPage - 1) * PAGE_SIZE + 1}–
            {Math.min(currentPage * PAGE_SIZE, ordered.length)} de {ordered.length} · página{" "}
            {currentPage} de {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Anterior
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Siguiente
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function Tab({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`inline-flex items-center gap-2 rounded-pill px-3 py-1.5 text-xs font-medium transition ${
        active
          ? "bg-primary text-primary-foreground"
          : "border border-border bg-background hover:bg-muted"
      }`}
    >
      {label}
      <span
        className={`rounded-pill px-1.5 text-[10px] ${
          active ? "bg-primary-foreground/20" : "bg-muted text-muted-foreground"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: ReadonlyArray<readonly [string, string]>;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-border bg-background px-2 py-1 text-xs"
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}

const STAGE_TONE: Record<CaseStage["tone"], string> = {
  neutral: "bg-muted text-muted-foreground",
  info: "bg-info/15 text-info",
  warning: "bg-warning/15 text-warning",
  success: "bg-success/15 text-success",
  danger: "bg-destructive/15 text-destructive",
};

function slaClass(s: CaseRow["sla_status"]) {
  return s === "overdue"
    ? "bg-destructive/15 text-destructive"
    : s === "due_soon"
      ? "bg-warning/15 text-warning"
      : s === "on_time"
        ? "bg-success/15 text-success"
        : "bg-muted text-muted-foreground";
}

/**
 * Traza económica del expediente: cotizaciones pedidas/recibidas,
 * propuesta vigente con su monto y estado real del pago.
 */
function ProposalTrace({ followUp }: { followUp: CaseFollowUp | null }) {
  if (!followUp) return null;
  const parts: string[] = [];

  const requested = followUp.quotes_requested ?? 0;
  const submitted = followUp.quotes_submitted ?? 0;
  if (requested > 0 || submitted > 0) {
    parts.push(`Cotizaciones: ${submitted} recibida(s) · ${requested} pendiente(s)`);
  }

  const proposal = followUp.latest_proposal_status;
  if (proposal) {
    const money =
      typeof followUp.latest_proposal_total_cents === "number"
        ? new Intl.NumberFormat("es-MX", {
            style: "currency",
            currency: followUp.latest_proposal_currency ?? "MXN",
          }).format(followUp.latest_proposal_total_cents / 100)
        : null;
    const label = PROPOSAL_LABEL[proposal] ?? proposal;
    parts.push(`Propuesta ${label}${money ? ` · ${money}` : ""}`);
    if (followUp.latest_proposal_sent_at) {
      parts.push(`Enviada ${meridaDateTime(followUp.latest_proposal_sent_at)}`);
    }
  }

  if (followUp.order_status) {
    const paid = followUp.order_status === "paid" || followUp.order_status === "fulfilled";
    parts.push(
      paid
        ? `Pagado${followUp.order_paid_at ? ` el ${meridaDate(followUp.order_paid_at)}` : ""}`
        : "Reservación creada, pago pendiente",
    );
  }

  if (parts.length === 0) return null;
  return <p className="mt-1 text-xs text-muted-foreground">{parts.join(" · ")}</p>;
}

const PROPOSAL_LABEL: Record<string, string> = {
  draft: "en borrador",
  sent: "enviada",
  viewed: "vista por el viajero",
  accepted: "aceptada",
  rejected: "rechazada",
  withdrawn: "retirada",
  superseded: "reemplazada",
  expired: "vencida",
};

function CaseRowCard({
  caseRow: c,
  stage,
  followUp,
  ownerId,
  ownerName,
  phase,
  pendingQuestionSince,
  directory,
  isLead,
}: {
  caseRow: CaseRow;
  stage: CaseStage;
  followUp: CaseFollowUp | null;
  ownerId: string | null;
  ownerName: string | null;
  phase: TripPhase;
  pendingQuestionSince: string | null;
  directory: DirectoryEntry[];
  isLead: boolean;
}) {
  const queryClient = useQueryClient();
  const assignSelf = useServerFn(assignSelfConciergeCase);
  const assignTo = useServerFn(assignConciergeCase);
  const reassignTo = useServerFn(reassignConciergeCase);
  const release = useServerFn(releaseConciergeCase);
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<unknown>, okMessage: string) {
    setBusy(true);
    try {
      await action();
      await queryClient.invalidateQueries({ queryKey: ["concierge"] });
      toast.success(okMessage);
    } catch (error) {
      const forbidden = error instanceof Error && error.message.toLowerCase().includes("forbidden");
      toast.error(
        forbidden
          ? "Tu perfil actual no puede hacer este cambio. Usa un perfil Concierge, Concierge Lead o Administrador."
          : "No fue posible completar la acción. Intenta nuevamente.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="rounded-md border border-border bg-card p-4 text-sm shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-xs font-medium text-foreground">{caseReference(c.id)}</span>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-pill px-2 py-0.5 text-[11px] font-medium ${STAGE_TONE[stage.tone]}`}
          >
            {stage.label}
          </span>
          <span
            className={`rounded-pill px-2 py-0.5 text-[11px] font-medium ${STAGE_TONE[phase.tone]}`}
          >
            {phase.label}
          </span>
          {pendingQuestionSince ? (
            <span className="rounded-pill bg-destructive/15 px-2 py-0.5 text-[11px] font-medium text-destructive">
              Pregunta sin responder
            </span>
          ) : null}
          <span
            className={`rounded-pill px-2 py-0.5 text-[11px] font-medium ${slaClass(c.sla_status)}`}
          >
            SLA · {c.sla_status ? SLA_LABEL[c.sla_status] : "sin objetivo"}
          </span>
          <span className="rounded-pill bg-muted px-2 py-0.5 text-[11px] font-medium">
            Prioridad {PRIORITY_LABEL[c.priority] ?? c.priority}
          </span>
        </div>
      </div>

      <Link
        to="/concierge/expedientes/$caseId"
        params={{ caseId: c.id }}
        className="mt-2 block font-medium hover:underline"
      >
        {c.summary ?? "Viaje enviado al Concierge"}
      </Link>

      <p className="mt-1 text-xs text-muted-foreground">{stage.nextAction}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Viaje: {phase.detail}
        {followUp?.trip_start_date
          ? ` · ${meridaDate(followUp.trip_start_date)}${
              followUp.trip_end_date ? ` → ${meridaDate(followUp.trip_end_date)}` : ""
            }`
          : ""}
      </p>
      {pendingQuestionSince ? (
        <p className="mt-1 text-xs font-medium text-destructive">
          El viajero escribió el {meridaDateTime(pendingQuestionSince)} y espera respuesta.{" "}
          <Link
            to="/concierge/expedientes/$caseId"
            params={{ caseId: c.id }}
            className="underline"
          >
            Responder
          </Link>
        </p>
      ) : null}

      <ProposalTrace followUp={followUp} />

      <p className="mt-2 text-xs text-muted-foreground">
        Responsable:{" "}
        <strong className="font-medium text-foreground">
          {ownerId ? (ownerName ?? "Concierge asignado") : "Sin asignar"}
        </strong>
        {c.last_activity_at
          ? ` · Última actividad ${meridaDateTime(c.last_activity_at)}`
          : ""}
        {c.target_response_at
          ? ` · Objetivo ${meridaDateTime(c.target_response_at)}`
          : ""}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
        {!ownerId ? (
          <Button
            type="button"
            size="sm"
            disabled={busy}
            onClick={() =>
              run(
                () => assignSelf({ data: { caseId: c.id } }),
                "El expediente quedó asignado a ti.",
              )
            }
          >
            {busy ? "Asignando…" : "Asignarme este expediente"}
          </Button>
        ) : null}

        {isLead ? (
          <>
            <label className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Asignar a</span>
              <select
                defaultValue=""
                disabled={busy}
                onChange={(e) => {
                  const next = e.target.value;
                  e.currentTarget.value = "";
                  if (!next) return;
                  void run(
                    () =>
                      ownerId
                        ? reassignTo({ data: { caseId: c.id, newConciergeUserId: next } })
                        : assignTo({ data: { caseId: c.id, conciergeUserId: next } }),
                    "Expediente asignado.",
                  );
                }}
                className="rounded-md border border-border bg-background px-2 py-1 text-xs"
              >
                <option value="">Elegir concierge…</option>
                {directory
                  .filter((d) => d.active)
                  .map((d) => (
                    <option key={d.user_id} value={d.user_id}>
                      {d.display_name ?? d.user_id.slice(0, 8)}
                    </option>
                  ))}
              </select>
            </label>
            {ownerId ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() =>
                  run(() => release({ data: { caseId: c.id } }), "Expediente liberado.")
                }
              >
                Liberar
              </Button>
            ) : null}
          </>
        ) : null}
      </div>
    </li>
  );
}
