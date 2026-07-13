/**
 * 14.60.2 — Customer Case File · vista de composición (read-only).
 * Consume concierge_case_file_v1 y respeta visibilidad por rol.
 */
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useRouter, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  acceptConciergeProposal,
  rejectConciergeProposal,
  sendConciergeProposal,
  viewConciergeProposal,
  withdrawConciergeProposal,
  createConciergeProposal,
  assignConciergeCase,
  releaseConciergeCase,
  setConciergeCasePriority,
  getConciergeCaseHandoffContext,
} from "@/lib/concierge/concierge.functions";
import { createOrderFromProposal } from "@/lib/concierge/orders.functions";
import {
  generateAluxSummary,
  generateAluxProducts,
  generateAluxProposalDraft,
  generateAluxCommsDigest,
  generateAluxRiskDetection,
  generateAluxOpportunityDetection,
  type AluxSuggestion,
  type AluxCapability,
} from "@/lib/concierge/alux.functions";

type CaseFile = {
  case: {
    id: string;
    status: string;
    priority: string;
    source: string;
    summary: string | null;
    created_at: string;
    updated_at: string;
    traveler_user_id: string;
    target_response_at?: string | null;
    last_activity_at?: string | null;
    priority_source?: string | null;
    priority_reason?: string | null;
  };
  viewer: { user_id: string; is_internal: boolean };
  traveler: { user_id: string; display_name?: string | null; preferred_language?: string | null };
  travel_plan: { id: string } | null;
  requests: Array<{
    id: string;
    title: string;
    kind: string;
    status: string;
    source_type: string;
    notes: string | null;
  }>;
  links: Array<{ link_type: string; target_id: string }>;
  businesses: Array<{ id: string; display_name: string; slug: string | null }>;
  timeline: Array<{
    id: string;
    event_type: string;
    summary: string | null;
    occurred_at: string;
    severity: string;
  }>;
  quotes?: Array<{
    quote_id: string;
    request_id: string;
    business_id: string;
    business_name: string | null;
    status: string;
    currency: string;
    total_amount_cents: number | null;
    valid_until: string | null;
    submitted_at: string | null;
    expired_at: string | null;
    created_at: string;
    notes: string | null;
    terms: string | null;
    request_title: string;
    request_kind: string;
  }>;
  proposals?: Array<{
    proposal_id: string;
    status: string;
    version: number;
    supersedes_proposal_id: string | null;
    currency: string;
    total_amount_cents: number | null;
    valid_until: string | null;
    summary: string | null;
    terms: string | null;
    sent_at: string | null;
    viewed_at: string | null;
    responded_at: string | null;
    created_at: string;
    items: Array<{
      item_id: string;
      quote_id: string;
      request_id: string;
      position: number;
      amount_cents: number;
      currency: string;
      notes: string | null;
      business_id: string;
      business_name: string | null;
      request_title: string;
    }>;
  }>;
  assignment?: {
    id: string;
    concierge_user_id: string;
    assigned_at: string;
    status: string;
  } | null;
  assignments?: Array<{
    id: string;
    concierge_user_id: string;
    status: string;
    assigned_at: string;
    released_at: string | null;
    reason: string | null;
  }>;
  sla?: {
    priority: string;
    priority_source: string | null;
    priority_reason: string | null;
    target_response_at: string | null;
    last_activity_at: string | null;
    first_response_at: string | null;
    sla_status: "on_time" | "due_soon" | "overdue" | null;
  } | null;
};

export function CaseFileView({ data, hideInternal = false }: { data: unknown; hideInternal?: boolean }) {
  const f = data as CaseFile | null;
  if (!f) return <p className="text-sm text-muted-foreground">Expediente no disponible.</p>;
  const internal = f.viewer.is_internal && !hideInternal;

  return (
    <div className="grid gap-6">
      <Header f={f} />
      {internal && <SlaAssignmentPanel f={f} />}
      {internal && <HandoffContextCard caseId={f.case.id} />}
      {internal && <AluxAssistantPanel caseId={f.case.id} />}
      <Section title="Solicitudes">
        {f.requests.length === 0 ? (
          <Empty>Sin solicitudes registradas.</Empty>
        ) : (
          <ul className="grid gap-2">
            {f.requests.map((r) => (
              <li key={r.id} className="rounded-md border border-border bg-card p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{r.title}</span>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                    {r.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Tipo: {r.kind} · Origen: {r.source_type}
                </p>
                {r.notes ? <p className="mt-1 text-xs text-foreground/80">{r.notes}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </Section>

      {f.businesses.length > 0 && (
        <Section title="Empresas participantes">
          <ul className="flex flex-wrap gap-2 text-xs">
            {f.businesses.map((b) => (
              <li
                key={b.id}
                className="rounded-full border border-border bg-card px-3 py-1"
              >
                {b.display_name}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {internal && f.quotes && f.quotes.length > 0 && (
        <Section title="Cotizaciones">
          <ul className="grid gap-2">
            {f.quotes.map((q) => (
              <li key={q.quote_id} className="rounded-md border border-border bg-card p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">
                    {q.business_name ?? "Empresa"} · {q.request_title}
                  </span>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                    {q.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {q.total_amount_cents != null
                    ? `${(q.total_amount_cents / 100).toLocaleString("es-MX", { style: "currency", currency: q.currency })}`
                    : "Sin monto"}
                  {q.valid_until ? ` · Vigente hasta ${new Date(q.valid_until).toLocaleString()}` : ""}
                </p>
                {q.notes ? <p className="mt-1 text-xs text-foreground/80">{q.notes}</p> : null}
              </li>
            ))}
          </ul>
        </Section>
      )}

      <ProposalsSection f={f} internal={internal} />

      {internal && (
        <Section title="Enlaces internos">
          {f.links.length === 0 ? (
            <Empty>Sin enlaces.</Empty>
          ) : (
            <ul className="grid gap-1 text-xs text-muted-foreground">
              {f.links.map((l, i) => (
                <li key={i} className="font-mono">
                  {l.link_type} · {l.target_id.slice(0, 8)}
                </li>
              ))}
            </ul>
          )}
        </Section>
      )}

      <Section title="Línea de tiempo" id="case-timeline">
        {f.timeline.length === 0 ? (
          <Empty>Sin eventos.</Empty>
        ) : (
          <ol className="grid gap-2">
            {f.timeline.map((t) => (
              <li key={t.id} className="rounded-md border border-border bg-card p-3 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{t.event_type}</span>
                  <span className="text-muted-foreground">
                    {new Date(t.occurred_at).toLocaleString()}
                  </span>
                </div>
                {t.summary ? <p className="mt-1 text-foreground/80">{t.summary}</p> : null}
              </li>
            ))}
          </ol>
        )}
      </Section>
    </div>
  );
}

function Header({ f }: { f: CaseFile }) {
  return (
    <header className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-xs text-muted-foreground">{f.case.id.slice(0, 8)}</span>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
          {f.case.status}
        </span>
      </div>
      <h2 className="mt-2 text-lg font-semibold">{f.case.summary ?? "Sin resumen"}</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Origen: {f.case.source} · Prioridad: {f.case.priority} · Creado{" "}
        {new Date(f.case.created_at).toLocaleString()}
      </p>
      {f.traveler.display_name && (
        <p className="mt-1 text-xs text-muted-foreground">
          Viajero: {f.traveler.display_name}
        </p>
      )}
    </header>
  );
}

function Section({ title, children, id }: { title: string; children: ReactNode; id?: string }) {
  return (
    <section id={id} className={id ? "scroll-mt-24" : undefined}>
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-md border border-dashed border-border bg-card/40 p-3 text-xs text-muted-foreground">
      {children}
    </p>
  );
}

function money(cents: number | null, currency: string) {
  if (cents == null) return "—";
  return (cents / 100).toLocaleString("es-MX", { style: "currency", currency });
}

function ProposalsSection({ f, internal }: { f: CaseFile; internal: boolean }) {
  const proposals = f.proposals ?? [];
  if (proposals.length === 0 && !internal) return null;

  return (
    <Section title="Propuestas">
      {proposals.length === 0 ? (
        <Empty>Sin propuestas todavía.</Empty>
      ) : (
        <ul className="grid gap-3">
          {proposals.map((p) => (
            <ProposalCard
              key={p.proposal_id}
              p={p}
              caseId={f.case.id}
              internal={internal}
            />
          ))}
        </ul>
      )}
      {internal && f.quotes && f.quotes.some((q) => q.status === "submitted") ? (
        <ProposalComposer caseId={f.case.id} quotes={f.quotes} />
      ) : null}
    </Section>
  );
}

function ProposalCard({
  p,
  caseId: _caseId,
  internal,
}: {
  p: NonNullable<CaseFile["proposals"]>[number];
  caseId: string;
  internal: boolean;
}) {
  const router = useRouter();
  const navigate = useNavigate();
  const sendFn = useServerFn(sendConciergeProposal);
  const withdrawFn = useServerFn(withdrawConciergeProposal);
  const viewFn = useServerFn(viewConciergeProposal);
  const acceptFn = useServerFn(acceptConciergeProposal);
  const rejectFn = useServerFn(rejectConciergeProposal);
  const createOrderFn = useServerFn(createOrderFromProposal);
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    try {
      await action();
      await router.invalidate();
    } finally {
      setBusy(false);
    }
  }

  // Marcar como vista al renderizar para el viajero (idempotente, server-side)
  if (!internal && p.status === "sent") {
    void viewFn({ data: { proposalId: p.proposal_id } }).catch(() => {});
  }

  return (
    <li className="rounded-md border border-border bg-card p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium">
          Propuesta v{p.version} · {money(p.total_amount_cents, p.currency)}
        </span>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
          {p.status}
        </span>
      </div>
      {p.summary ? <p className="mt-1 text-xs text-foreground/80">{p.summary}</p> : null}
      {p.valid_until ? (
        <p className="mt-1 text-[11px] text-muted-foreground">
          Vigente hasta {new Date(p.valid_until).toLocaleString()}
        </p>
      ) : null}
      {p.items.length > 0 && (
        <ul className="mt-2 grid gap-1 text-xs">
          {p.items.map((it) => (
            <li
              key={it.item_id}
              className="flex items-center justify-between gap-2 rounded border border-border/60 bg-background/60 px-2 py-1"
            >
              <span>
                {it.business_name ?? "Empresa"} · {it.request_title}
              </span>
              <span className="font-mono">{money(it.amount_cents, it.currency)}</span>
            </li>
          ))}
        </ul>
      )}
      {p.terms ? (
        <p className="mt-2 whitespace-pre-line text-[11px] text-muted-foreground">{p.terms}</p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        {internal && p.status === "draft" && (
          <ActionButton
            label="Enviar al viajero"
            disabled={busy}
            onClick={() => run(() => sendFn({ data: { proposalId: p.proposal_id } }))}
          />
        )}
        {internal && ["draft", "sent", "viewed"].includes(p.status) && (
          <ActionButton
            label="Retirar"
            variant="ghost"
            disabled={busy}
            onClick={() => run(() => withdrawFn({ data: { proposalId: p.proposal_id, reason: null } }))}
          />
        )}
        {!internal && ["sent", "viewed", "accepted"].includes(p.status) && (
          <>
            <ActionButton
              label={p.status === "accepted" ? "Confirmar mi viaje" : "Confirmar mi viaje"}
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  // Marca aceptada en el dominio concierge (idempotente)
                  if (p.status !== "accepted") {
                    await acceptFn({ data: { proposalId: p.proposal_id } });
                  }
                  const { orderId } = await createOrderFn({
                    data: { proposalId: p.proposal_id },
                  });
                  await router.invalidate();
                  navigate({
                    to: "/cuenta/checkout/$orderId",
                    params: { orderId },
                  });
                } catch (err) {
                  toast.error(
                    err instanceof Error
                      ? err.message
                      : "No se pudo abrir la confirmación del viaje",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            />
            {p.status !== "accepted" ? (
              <ActionButton
                label="Rechazar"
                variant="ghost"
                disabled={busy}
                onClick={() => run(() => rejectFn({ data: { proposalId: p.proposal_id, reason: null } }))}
              />
            ) : null}
          </>
        )}
      </div>
    </li>
  );
}

function ProposalComposer({
  caseId,
  quotes,
}: {
  caseId: string;
  quotes: NonNullable<CaseFile["quotes"]>;
}) {
  const router = useRouter();
  const createFn = useServerFn(createConciergeProposal);
  const submittable = quotes.filter((q) => q.status === "submitted");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [summary, setSummary] = useState("");
  const [busy, setBusy] = useState(false);

  async function onCreate() {
    const items = Object.entries(selected)
      .filter(([, v]) => v)
      .map(([quote_id]) => ({ quote_id }));
    if (items.length === 0) return;
    setBusy(true);
    try {
      await createFn({
        data: { caseId, items, summary: summary || null },
      });
      setSelected({});
      setSummary("");
      await router.invalidate();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 rounded-md border border-dashed border-border bg-card/40 p-3 text-xs">
      <p className="mb-2 font-medium uppercase tracking-wide text-muted-foreground">
        Componer nueva propuesta
      </p>
      <ul className="grid gap-1">
        {submittable.map((q) => (
          <li key={q.quote_id} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!selected[q.quote_id]}
              onChange={(e) =>
                setSelected((s) => ({ ...s, [q.quote_id]: e.target.checked }))
              }
            />
            <span className="flex-1">
              {q.business_name ?? "Empresa"} · {q.request_title} ·{" "}
              {money(q.total_amount_cents, q.currency)}
            </span>
          </li>
        ))}
      </ul>
      <textarea
        className="mt-2 w-full rounded border border-border bg-background p-2 text-xs"
        rows={2}
        placeholder="Resumen para el viajero (opcional)"
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
      />
      <div className="mt-2 flex justify-end">
        <ActionButton
          label="Crear borrador"
          disabled={busy || Object.values(selected).every((v) => !v)}
          onClick={onCreate}
        />
      </div>
    </div>
  );
}

function ActionButton({
  label,
  onClick,
  disabled,
  variant = "primary",
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: "primary" | "ghost";
}) {
  const base =
    "rounded-md px-3 py-1.5 text-xs font-medium transition disabled:opacity-50";
  const cls =
    variant === "primary"
      ? `${base} bg-primary text-primary-foreground hover:bg-primary/90`
      : `${base} border border-border bg-background hover:bg-muted`;
  return (
    <button type="button" className={cls} onClick={onClick} disabled={disabled}>
      {label}
    </button>
  );
}

/* ============================================================
 * 14.60.5 — SLA + Asignaciones (sólo visible a internos)
 * ============================================================ */
function SlaAssignmentPanel({ f }: { f: CaseFile }) {
  const router = useRouter();
  const assignFn = useServerFn(assignConciergeCase);
  const releaseFn = useServerFn(releaseConciergeCase);
  const setPriorityFn = useServerFn(setConciergeCasePriority);
  const [busy, setBusy] = useState(false);

  const sla = f.sla ?? null;
  const assignment = f.assignment ?? null;
  const viewerId = f.viewer.user_id;
  const isAssignedToMe = assignment?.concierge_user_id === viewerId;

  const slaBadge =
    sla?.sla_status === "overdue"
      ? "bg-destructive/15 text-destructive"
      : sla?.sla_status === "due_soon"
        ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
        : sla?.sla_status === "on_time"
          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
          : "bg-muted text-muted-foreground";

  async function doAssignSelf() {
    setBusy(true);
    try {
      await assignFn({ data: { caseId: f.case.id, conciergeUserId: viewerId } });
      router.invalidate();
    } finally {
      setBusy(false);
    }
  }
  async function doRelease() {
    setBusy(true);
    try {
      await releaseFn({ data: { caseId: f.case.id } });
      router.invalidate();
    } finally {
      setBusy(false);
    }
  }
  async function changePriority(p: "low" | "normal" | "high" | "urgent") {
    setBusy(true);
    try {
      await setPriorityFn({ data: { caseId: f.case.id, priority: p, source: "manual" } });
      router.invalidate();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className={`rounded-full px-2 py-0.5 font-medium ${slaBadge}`}>
            SLA · {sla?.sla_status ?? "n/a"}
          </span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
            Prioridad: <strong className="text-foreground">{f.case.priority}</strong>
            {f.case.priority_source ? ` · ${f.case.priority_source}` : ""}
          </span>
          {sla?.target_response_at && (
            <span className="text-muted-foreground">
              Objetivo: {new Date(sla.target_response_at).toLocaleString()}
            </span>
          )}
          {sla?.last_activity_at && (
            <span className="text-muted-foreground">
              Última actividad: {new Date(sla.last_activity_at).toLocaleString()}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!assignment && (
            <ActionButton label="Asignarme" onClick={doAssignSelf} disabled={busy} />
          )}
          {assignment && isAssignedToMe && (
            <ActionButton label="Liberar" variant="ghost" onClick={doRelease} disabled={busy} />
          )}
          {assignment && !isAssignedToMe && (
            <span className="text-xs text-muted-foreground">
              Responsable: {assignment.concierge_user_id.slice(0, 8)}
            </span>
          )}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="text-muted-foreground">Cambiar prioridad:</span>
        {(["low", "normal", "high", "urgent"] as const).map((p) => (
          <button
            key={p}
            type="button"
            disabled={busy || p === f.case.priority}
            onClick={() => changePriority(p)}
            className="rounded-md border border-border bg-background px-2 py-1 text-[11px] font-medium hover:bg-muted disabled:opacity-50"
          >
            {p}
          </button>
        ))}
      </div>
    </section>
  );
}

/* ============================================================
 * 14.60.6 — Asistente Alux (read-only, sólo internos)
 * ============================================================ */

/* ============================================================
 * CV2.1 — Handoff Context (fotografía del viajero al promover el plan)
 * ============================================================ */
type HandoffPayload = {
  version?: string;
  generated_at?: string;
  source?: string;
  profile?: Record<string, unknown> | null;
  active_coupons?: Array<Record<string, unknown>>;
  territorial_memory?: Record<string, unknown> | null;
  plan_snapshot?: {
    item_count?: number;
    items?: Array<{ kind?: string; title?: string | null; slug?: string | null; subtitle?: string | null }>;
  } | null;
};

function HandoffContextCard({ caseId }: { caseId: string }) {
  const fetchFn = useServerFn(getConciergeCaseHandoffContext);
  const [payload, setPayload] = useState<HandoffPayload | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "empty" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setState("loading");
    fetchFn({ data: { caseId } })
      .then((raw) => {
        if (!alive) return;
        if (!raw) {
          setState("empty");
          return;
        }
        setPayload(raw as HandoffPayload);
        setState("idle");
      })
      .catch((e) => {
        if (!alive) return;
        setError(e instanceof Error ? e.message : String(e));
        setState("error");
      });
    return () => {
      alive = false;
    };
  }, [caseId, fetchFn]);

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">Contexto del viajero (Alux)</h3>
          <p className="text-[11px] text-muted-foreground">
            Fotografía inmutable capturada al promover el Travel Plan.
          </p>
        </div>
        {payload?.generated_at && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
            {new Date(payload.generated_at).toLocaleString()}
          </span>
        )}
      </header>

      {state === "loading" && (
        <p className="mt-3 text-xs text-muted-foreground">Cargando contexto…</p>
      )}
      {state === "empty" && (
        <p className="mt-3 text-xs text-muted-foreground">
          Sin fotografía adjunta todavía. Se capturará automáticamente al promover el plan del viajero.
        </p>
      )}
      {state === "error" && (
        <p className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
          {error ?? "No se pudo cargar el contexto."}
        </p>
      )}

      {state === "idle" && payload && (
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <HandoffBlock title="Perfil del viajero">
            {payload.profile ? (
              <ProfileSummary profile={payload.profile} />
            ) : (
              <Empty>Sin perfil M2 disponible.</Empty>
            )}
          </HandoffBlock>

          <HandoffBlock title={`Cupones activos (${payload.active_coupons?.length ?? 0})`}>
            {payload.active_coupons && payload.active_coupons.length > 0 ? (
              <ul className="grid gap-1 text-xs">
                {payload.active_coupons.slice(0, 6).map((c, i) => (
                  <li key={i} className="truncate">
                    · {(c.code as string) ?? (c.id as string) ?? "cupón"}
                    {c.business_name ? ` — ${c.business_name as string}` : ""}
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>Sin cupones vigentes.</Empty>
            )}
          </HandoffBlock>

          <HandoffBlock title={`Plan (${payload.plan_snapshot?.item_count ?? 0} ítems)`}>
            {payload.plan_snapshot?.items && payload.plan_snapshot.items.length > 0 ? (
              <ul className="grid gap-1 text-xs">
                {payload.plan_snapshot.items.slice(0, 8).map((it, i) => (
                  <li key={i} className="truncate">
                    · <span className="text-muted-foreground">[{it.kind ?? "?"}]</span>{" "}
                    {it.title ?? it.slug ?? "—"}
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>Plan vacío al momento del handoff.</Empty>
            )}
          </HandoffBlock>

          <HandoffBlock title="Memoria territorial">
            {payload.territorial_memory ? (
              <pre className="whitespace-pre-wrap break-words text-[11px] text-muted-foreground">
                {JSON.stringify(payload.territorial_memory, null, 2).slice(0, 600)}
              </pre>
            ) : (
              <Empty>Sin historial territorial registrado.</Empty>
            )}
          </HandoffBlock>
        </div>
      )}
    </section>
  );
}

function HandoffBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="rounded-md border border-dashed border-border bg-background/60 p-3">
      <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-foreground">
        {title}
      </h4>
      {children}
    </article>
  );
}

function ProfileSummary({ profile }: { profile: Record<string, unknown> }) {
  const all: Array<[string, unknown]> = [
    ["Idioma", profile.preferred_language],
    ["País", profile.country_code],
    ["Moneda", profile.preferred_currency],
    ["Presupuesto", profile.budget_level],
    ["Dieta", profile.dietary_preferences],
    ["Movilidad", profile.mobility_needs],
    ["Intereses", profile.interests],
  ];
  const rows = all.filter(([, v]) => v !== undefined && v !== null && v !== "");
  if (rows.length === 0) return <Empty>Perfil sin campos declarados.</Empty>;
  return (
    <dl className="grid gap-1 text-xs">
      {rows.map(([k, v]) => (
        <div key={k} className="flex gap-2">
          <dt className="min-w-[80px] text-muted-foreground">{k}</dt>
          <dd className="flex-1 truncate text-foreground/90">
            {Array.isArray(v) ? (v as unknown[]).join(", ") : String(v)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

type AluxState = Partial<Record<AluxCapability, AluxSuggestion>>;

const ALUX_LABELS: Record<AluxCapability, string> = {
  summary: "Resumir expediente",
  products: "Sugerir productos",
  proposal_draft: "Borrador de propuesta",
  comms_digest: "Resumen de comunicaciones",
  risk_detection: "Detectar riesgos",
  opportunity_detection: "Detectar oportunidades",
};

function AluxAssistantPanel({ caseId }: { caseId: string }) {
  const summaryFn = useServerFn(generateAluxSummary);
  const productsFn = useServerFn(generateAluxProducts);
  const draftFn = useServerFn(generateAluxProposalDraft);
  const commsFn = useServerFn(generateAluxCommsDigest);
  const riskFn = useServerFn(generateAluxRiskDetection);
  const oppFn = useServerFn(generateAluxOpportunityDetection);

  const [results, setResults] = useState<AluxState>({});
  const [busy, setBusy] = useState<AluxCapability | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(cap: AluxCapability) {
    setBusy(cap);
    setError(null);
    try {
      let res: AluxSuggestion;
      switch (cap) {
        case "summary":
          res = await summaryFn({ data: { caseId } });
          break;
        case "products":
          res = await productsFn({ data: { caseId } });
          break;
        case "proposal_draft":
          res = await draftFn({ data: { caseId, productIds: [] } });
          break;
        case "comms_digest":
          res = await commsFn({ data: { caseId } });
          break;
        case "risk_detection":
          res = await riskFn({ data: { caseId } });
          break;
        case "opportunity_detection":
          res = await oppFn({ data: { caseId } });
          break;
      }
      setResults((s) => ({ ...s, [cap]: res }));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">Asistente Alux</h3>
          <p className="text-[11px] text-muted-foreground">
            Copiloto operativo en modo consultivo. Toda acción la ejecutas tú.
          </p>
        </div>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
          read-only
        </span>
      </header>
      <div className="mt-3 flex flex-wrap gap-2">
        {(Object.keys(ALUX_LABELS) as AluxCapability[]).map((cap) => (
          <button
            key={cap}
            type="button"
            disabled={busy !== null}
            onClick={() => run(cap)}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
          >
            {busy === cap ? "Generando…" : ALUX_LABELS[cap]}
          </button>
        ))}
      </div>
      {error && (
        <p className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
          {error}
        </p>
      )}
      <div className="mt-4 grid gap-3">
        {(Object.keys(results) as AluxCapability[]).map((cap) => {
          const r = results[cap]!;
          return (
            <article
              key={cap}
              className="rounded-md border border-dashed border-border bg-background/60 p-3"
            >
              <header className="mb-2 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                <span className="font-semibold uppercase tracking-wide text-foreground">
                  {ALUX_LABELS[cap]}
                </span>
                <span>
                  {r.model} · {r.latency_ms} ms
                </span>
              </header>
              <pre className="whitespace-pre-wrap break-words text-xs text-foreground/90">
                {r.text}
              </pre>
              <footer className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px] text-muted-foreground">
                <span>{r.disclaimer}</span>
                <button
                  type="button"
                  onClick={() => navigator.clipboard?.writeText(r.text)}
                  className="rounded border border-border bg-card px-2 py-0.5 hover:bg-muted"
                >
                  Copiar
                </button>
              </footer>
            </article>
          );
        })}
      </div>
    </section>
  );
}